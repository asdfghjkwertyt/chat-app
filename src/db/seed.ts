import { db } from "./index";
import {
  users,
  conversations,
  conversationMembers,
  messages,
  contacts,
  callLogs,
} from "./schema";
import bcrypt from "bcryptjs";
import { count } from "drizzle-orm";

export async function seed() {
  const existing = await db.select({ c: count() }).from(users);
  if (existing[0].c > 0) return;

  // Strong hash for demo – password is "Demo1234"
  const hash = await bcrypt.hash("Demo1234", 14);

  const demoUsers = [
    {
      username: "sarah_dev",
      displayName: "Sarah Chen",
      email: "sarah@connecthub.io",
      passwordHash: hash,
      avatarUrl: null,
      status: "online" as const,
      statusMessage: "Working on the new feature 🚀",
      lastSeen: new Date(),
    },
    {
      username: "mike_design",
      displayName: "Mike Johnson",
      email: "mike@connecthub.io",
      passwordHash: hash,
      avatarUrl: null,
      status: "online" as const,
      statusMessage: "In a meeting",
      lastSeen: new Date(),
    },
    {
      username: "emma_pm",
      displayName: "Emma Wilson",
      email: "emma@connecthub.io",
      passwordHash: hash,
      avatarUrl: null,
      status: "away" as const,
      statusMessage: "BRB, lunch break 🍕",
      lastSeen: new Date(Date.now() - 30 * 60000),
    },
    {
      username: "alex_ops",
      displayName: "Alex Rivera",
      email: "alex@connecthub.io",
      passwordHash: hash,
      avatarUrl: null,
      status: "offline" as const,
      statusMessage: null,
      lastSeen: new Date(Date.now() - 3 * 3600000),
    },
    {
      username: "jordan_qa",
      displayName: "Jordan Lee",
      email: "jordan@connecthub.io",
      passwordHash: hash,
      avatarUrl: null,
      status: "online" as const,
      statusMessage: "Testing v2.0 🔍",
      lastSeen: new Date(),
    },
    {
      username: "demo",
      displayName: "Demo User",
      email: "demo@connecthub.io",
      passwordHash: hash,
      avatarUrl: null,
      status: "online" as const,
      statusMessage: "Exploring the app!",
      lastSeen: new Date(),
    },
  ];

  const insertedUsers = await db.insert(users).values(demoUsers).returning();
  const [sarah, mike, emma, alex, jordan, demo] = insertedUsers;

  const contactPairs = [
    { userId: demo.id, contactId: sarah.id },
    { userId: sarah.id, contactId: demo.id },
    { userId: demo.id, contactId: mike.id },
    { userId: mike.id, contactId: demo.id },
    { userId: demo.id, contactId: emma.id },
    { userId: emma.id, contactId: demo.id },
    { userId: demo.id, contactId: alex.id },
    { userId: alex.id, contactId: demo.id },
    { userId: demo.id, contactId: jordan.id },
    { userId: jordan.id, contactId: demo.id },
    { userId: sarah.id, contactId: mike.id },
    { userId: mike.id, contactId: sarah.id },
  ];
  await db.insert(contacts).values(contactPairs);

  const conv1 = await db
    .insert(conversations)
    .values({ isGroup: false, isEncrypted: true })
    .returning();
  const conv2 = await db
    .insert(conversations)
    .values({ isGroup: false, isEncrypted: true })
    .returning();
  const conv3 = await db
    .insert(conversations)
    .values({ isGroup: false, isEncrypted: true })
    .returning();
  const conv4 = await db
    .insert(conversations)
    .values({ isGroup: false, isEncrypted: true })
    .returning();
  const groupConv = await db
    .insert(conversations)
    .values({ name: "Project Alpha Team", isGroup: true, isEncrypted: true })
    .returning();

  await db.insert(conversationMembers).values([
    { conversationId: conv1[0].id, userId: demo.id },
    { conversationId: conv1[0].id, userId: sarah.id },
    { conversationId: conv2[0].id, userId: demo.id },
    { conversationId: conv2[0].id, userId: mike.id },
    { conversationId: conv3[0].id, userId: demo.id },
    { conversationId: conv3[0].id, userId: emma.id },
    { conversationId: conv4[0].id, userId: demo.id },
    { conversationId: conv4[0].id, userId: jordan.id },
    { conversationId: groupConv[0].id, userId: demo.id, role: "admin" },
    { conversationId: groupConv[0].id, userId: sarah.id },
    { conversationId: groupConv[0].id, userId: mike.id },
    { conversationId: groupConv[0].id, userId: emma.id },
  ]);

  const now = new Date();
  const mins = (m: number) => new Date(now.getTime() - m * 60000);

  // encryptionVersion=0 means plaintext demo data (shown as-is on client)
  await db.insert(messages).values([
    { conversationId: conv1[0].id, senderId: sarah.id, content: "Hey! Did you see the latest design mockups?", createdAt: mins(120), encryptionVersion: 0 },
    { conversationId: conv1[0].id, senderId: demo.id, content: "Yes! They look amazing 🎨", createdAt: mins(115), encryptionVersion: 0 },
    { conversationId: conv1[0].id, senderId: sarah.id, content: "The new dashboard layout is much cleaner", createdAt: mins(110), encryptionVersion: 0 },
    { conversationId: conv1[0].id, senderId: demo.id, content: "Agreed! I especially like the sidebar navigation", createdAt: mins(105), encryptionVersion: 0 },
    { conversationId: conv1[0].id, senderId: sarah.id, content: "Let's discuss the implementation details tomorrow?", createdAt: mins(30), encryptionVersion: 0 },
    { conversationId: conv1[0].id, senderId: demo.id, content: "Sounds good! I'll prepare some notes 📝", createdAt: mins(25), encryptionVersion: 0 },
    { conversationId: conv1[0].id, senderId: sarah.id, content: "Perfect, see you then!", createdAt: mins(20), encryptionVersion: 0 },
  ]);

  await db.insert(messages).values([
    { conversationId: conv2[0].id, senderId: mike.id, content: "The API endpoint for user profiles is ready for review", createdAt: mins(180), encryptionVersion: 0 },
    { conversationId: conv2[0].id, senderId: demo.id, content: "Awesome, I'll take a look right away", createdAt: mins(175), encryptionVersion: 0 },
    { conversationId: conv2[0].id, senderId: mike.id, content: "Also, I fixed that bug with the image upload", createdAt: mins(60), encryptionVersion: 0 },
    { conversationId: conv2[0].id, senderId: demo.id, content: "Great work! That was a tricky one 🐛", createdAt: mins(55), encryptionVersion: 0 },
  ]);

  await db.insert(messages).values([
    { conversationId: conv3[0].id, senderId: emma.id, content: "Sprint planning is at 2 PM today", createdAt: mins(240), encryptionVersion: 0 },
    { conversationId: conv3[0].id, senderId: demo.id, content: "Got it, thanks for the reminder!", createdAt: mins(235), encryptionVersion: 0 },
    { conversationId: conv3[0].id, senderId: emma.id, content: "Can you update the project timeline?", createdAt: mins(45), encryptionVersion: 0 },
  ]);

  await db.insert(messages).values([
    { conversationId: conv4[0].id, senderId: jordan.id, content: "Found a critical bug in the payment flow", createdAt: mins(90), encryptionVersion: 0 },
    { conversationId: conv4[0].id, senderId: demo.id, content: "Oh no! Can you share the reproduction steps?", createdAt: mins(85), encryptionVersion: 0 },
    { conversationId: conv4[0].id, senderId: jordan.id, content: "Sure, I'll create a detailed ticket with screenshots", createdAt: mins(80), encryptionVersion: 0 },
    { conversationId: conv4[0].id, senderId: demo.id, content: "Thanks Jordan, you're the best! 🙌", createdAt: mins(75), encryptionVersion: 0 },
  ]);

  await db.insert(messages).values([
    { conversationId: groupConv[0].id, senderId: sarah.id, content: "Team, we need to finalize the release notes", createdAt: mins(200), encryptionVersion: 0 },
    { conversationId: groupConv[0].id, senderId: mike.id, content: "I'll handle the technical changes section", createdAt: mins(195), encryptionVersion: 0 },
    { conversationId: groupConv[0].id, senderId: emma.id, content: "I can write the user-facing summary", createdAt: mins(190), encryptionVersion: 0 },
    { conversationId: groupConv[0].id, senderId: demo.id, content: "Great teamwork everyone! Let's aim for EOD 🎯", createdAt: mins(185), encryptionVersion: 0 },
    { conversationId: groupConv[0].id, senderId: sarah.id, content: "Don't forget to update the changelog too", createdAt: mins(10), encryptionVersion: 0 },
    { conversationId: groupConv[0].id, senderId: demo.id, content: "On it!", createdAt: mins(5), encryptionVersion: 0 },
  ]);

  await db.insert(callLogs).values([
    { conversationId: conv1[0].id, callerId: sarah.id, callType: "voice", status: "completed", startedAt: mins(300), endedAt: mins(285), duration: "15:00" },
    { conversationId: conv2[0].id, callerId: demo.id, callType: "video", status: "completed", startedAt: mins(500), endedAt: mins(470), duration: "30:00" },
    { conversationId: conv1[0].id, callerId: demo.id, callType: "voice", status: "missed", startedAt: mins(100) },
    { conversationId: groupConv[0].id, callerId: emma.id, callType: "video", status: "completed", startedAt: mins(400), endedAt: mins(360), duration: "40:00" },
  ]);

  console.log("✅ Database seeded with E2E encryption support");
}
