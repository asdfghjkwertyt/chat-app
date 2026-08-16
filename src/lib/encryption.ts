/**
 * End-to-End Encryption module using AES-256-GCM with ECDH key exchange.
 *
 * Flow:
 * 1. Each user generates an ECDH P-256 key pair on registration.
 * 2. The public key (JWK) is stored on the server.
 * 3. The private key (JWK) is stored in the browser's IndexedDB.
 * 4. To encrypt a message the sender derives a shared secret from
 *    their private key + the recipient's public key via ECDH,
 *    then uses AES-256-GCM with a random IV.
 * 5. The ciphertext + IV are sent to the server; content is never stored in plaintext.
 * 6. The recipient derives the same shared secret and decrypts client-side.
 *
 * For group chats a symmetric group key is generated and encrypted per-member.
 * For the demo we use a simpler symmetric approach where the conversation key
 * is derived from a shared passphrase so seeded data can be displayed.
 */

const DB_NAME = "connecthub_e2e";
const STORE_NAME = "keys";
const ENCRYPTION_VERSION = 1;

// ─── IndexedDB helpers ────────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Key generation / management ──────────────────────────────────

export async function generateKeyPair(): Promise<{
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
  const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  return { publicKey, privateKey };
}

export async function storePrivateKey(
  userId: string,
  privateKey: JsonWebKey
): Promise<void> {
  await idbSet(`privkey_${userId}`, privateKey);
}

export async function getPrivateKey(
  userId: string
): Promise<JsonWebKey | undefined> {
  return idbGet<JsonWebKey>(`privkey_${userId}`);
}

export async function clearPrivateKey(userId: string): Promise<void> {
  await idbDelete(`privkey_${userId}`);
}

// ─── Derive a shared AES key via ECDH ─────────────────────────────

async function deriveSharedKey(
  myPrivateJwk: JsonWebKey,
  theirPublicJwk: JsonWebKey
): Promise<CryptoKey> {
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    myPrivateJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey", "deriveBits"]
  );
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    theirPublicJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// ─── Symmetric helpers (used for group chats & fallback) ──────────

async function getSymmetricKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("connecthub-e2e-salt"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// ─── Encrypt / Decrypt ────────────────────────────────────────────

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(str: string): ArrayBuffer {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encryptMessage(
  plaintext: string,
  myPrivateJwk: JsonWebKey | null,
  theirPublicJwk: JsonWebKey | null,
  conversationId?: string
): Promise<{ encryptedContent: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();

  let key: CryptoKey;
  if (myPrivateJwk && theirPublicJwk) {
    key = await deriveSharedKey(myPrivateJwk, theirPublicJwk);
  } else {
    // Fallback: symmetric key derived from conversation id
    key = await getSymmetricKey(conversationId || "default-key");
  }

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );

  return {
    encryptedContent: toBase64(ciphertext),
    iv: toBase64(iv.buffer),
  };
}

export async function decryptMessage(
  encryptedContent: string,
  ivStr: string,
  myPrivateJwk: JsonWebKey | null,
  theirPublicJwk: JsonWebKey | null,
  conversationId?: string
): Promise<string> {
  try {
    const iv = new Uint8Array(fromBase64(ivStr));
    const ciphertext = fromBase64(encryptedContent);

    let key: CryptoKey;
    if (myPrivateJwk && theirPublicJwk) {
      key = await deriveSharedKey(myPrivateJwk, theirPublicJwk);
    } else {
      key = await getSymmetricKey(conversationId || "default-key");
    }

    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(plaintext);
  } catch {
    return "[Decryption failed — key mismatch]";
  }
}

export { ENCRYPTION_VERSION };
