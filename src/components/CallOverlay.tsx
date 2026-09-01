"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X } from "lucide-react";
import Avatar from "./Avatar";

interface CallOverlayProps {
  callId: string;
  callType: "audio" | "video";
  callerId: string;
  callerName: string;
  callerAvatar: string | null;
  isIncoming: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  conversationId: string;
  currentUserId: string;
}

export default function CallOverlay({
  callId,
  callType,
  callerId,
  callerName,
  callerAvatar,
  isIncoming,
  onAccept,
  onReject,
  onEnd,
  conversationId,
  currentUserId,
}: CallOverlayProps) {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === "audio");
  const [duration, setDuration] = useState(0);
  const [connectionState, setConnectionState] = useState("waiting");
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const signalingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize WebRTC with signaling
  useEffect(() => {
    if (!isActive) return;

    const initWebRTC = async () => {
      try {
        setConnectionState("connecting");
        
        // Get user media
        const constraints = {
          audio: true,
          video: callType === "video" && !isVideoOff ? { width: 1280, height: 720 } : false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (localVideoRef.current && callType === "video" && !isVideoOff) {
          localVideoRef.current.srcObject = stream;
        }

        // Create peer connection
        const config = {
          iceServers: [
            { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
            { urls: ["stun:stun2.l.google.com:19302", "stun:stun3.l.google.com:19302"] },
            { urls: ["stun:stun4.l.google.com:19302"] },
          ],
        };
        const peerConnection = new RTCPeerConnection(config);
        peerConnectionRef.current = peerConnection;

        // Add local stream
        stream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, stream);
        });

        // Handle remote stream
        peerConnection.ontrack = (event) => {
          console.log("Remote track received:", event.track.kind);
          if (remoteVideoRef.current && event.streams && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            remoteVideoRef.current.play().catch((err) => console.error("Play error:", err));
          }
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = async (event) => {
          if (event.candidate) {
            try {
              await fetch("/api/calls/signaling", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  callId,
                  type: "candidate",
                  data: JSON.stringify(event.candidate),
                }),
              });
            } catch (error) {
              console.error("Failed to send ICE candidate:", error);
            }
          }
        };

        // Handle connection state
        peerConnection.onconnectionstatechange = () => {
          console.log("Connection state:", peerConnection.connectionState);
          if (peerConnection.connectionState === "connected") {
            setConnectionState("connected");
          } else if (peerConnection.connectionState === "failed" || peerConnection.connectionState === "disconnected") {
            handleEndCall();
          }
        };

        peerConnection.oniceconnectionstatechange = () => {
          console.log("ICE connection state:", peerConnection.iceConnectionState);
        };

        // Start duration timer
        durationIntervalRef.current = setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);

        // Start signaling exchange
        let offer: RTCSessionDescriptionInit | null = null;

        if (!isIncoming) {
          // Caller: Create offer
          const offerSdp = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: callType === "video",
          });
          await peerConnection.setLocalDescription(offerSdp);
          offer = offerSdp;

          // Send offer to signaling server
          await fetch("/api/calls/signaling", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callId,
              type: "offer",
              data: JSON.stringify(offer),
            }),
          });
          console.log("Sent offer");
        }

        // Poll for answer/offer
        let signalingAttempts = 0;
        signalingIntervalRef.current = setInterval(async () => {
          try {
            const res = await fetch(`/api/calls/signaling?callId=${callId}`);
            const data = await res.json();

            if (!isIncoming && data.answer && peerConnection.remoteDescription === null) {
              // Caller receiving answer
              const answer = JSON.parse(data.answer);
              await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
              console.log("Received and set answer");
            } else if (isIncoming && data.offer && peerConnection.remoteDescription === null) {
              // Receiver receiving offer
              const offer = JSON.parse(data.offer);
              await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

              // Create and send answer
              const answerSdp = await peerConnection.createAnswer();
              await peerConnection.setLocalDescription(answerSdp);

              await fetch("/api/calls/signaling", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  callId,
                  type: "answer",
                  data: JSON.stringify(answerSdp),
                }),
              });
              console.log("Sent answer");
            }

            // Add ICE candidates
            if (data.candidates && data.candidates.length > 0) {
              for (const candidateJson of data.candidates) {
                try {
                  const candidate = JSON.parse(candidateJson);
                  if (candidate && peerConnection.remoteDescription) {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                  }
                } catch (error) {
                  console.error("Failed to add ICE candidate:", error);
                }
              }
            }

            signalingAttempts++;
            if (signalingAttempts > 30) {
              // Stop polling after 30 attempts (15 seconds)
              if (signalingIntervalRef.current) {
                clearInterval(signalingIntervalRef.current);
              }
            }
          } catch (error) {
            console.error("Signaling poll error:", error);
          }
        }, 500); // Poll every 500ms
      } catch (error) {
        console.error("WebRTC initialization error:", error);
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          alert("Please allow camera and microphone access to make calls");
        } else {
          alert("Unable to access camera/microphone: " + (error instanceof Error ? error.message : String(error)));
        }
        onReject();
      }
    };

    initWebRTC();

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (signalingIntervalRef.current) {
        clearInterval(signalingIntervalRef.current);
      }
    };
  }, [isActive, callType, isVideoOff, isIncoming, onReject, callId]);

  const handleAccept = async () => {
    try {
      const res = await fetch(`/api/calls/${callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to accept call" }));
        throw new Error(error.error || `Server error: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Call accepted:", data);
      
      // Only activate after successful backend acceptance
      setIsActive(true);
      onAccept();
    } catch (error) {
      console.error("Error accepting call:", error);
      alert(`Failed to accept call: ${error instanceof Error ? error.message : "Unknown error"}`);
      onReject();
    }
  };

  const handleRejectCall = async () => {
    try {
      const res = await fetch(`/api/calls/${callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to reject call" }));
        throw new Error(error.error || `Server error: ${res.status}`);
      }
      
      onReject();
    } catch (error) {
      console.error("Error rejecting call:", error);
      onReject();
    }
  };

  const handleEndCall = async () => {
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Notify backend
    try {
      const res = await fetch(`/api/calls/${callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      });
      
      if (!res.ok) {
        console.error("Failed to end call on backend:", res.status);
      }
    } catch (error) {
      console.error("Error ending call:", error);
    }

    onEnd();
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Only show incoming call screen for the receiver, not the caller
  if (!isActive && isIncoming) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-surface-900 to-surface-950 rounded-3xl p-8 max-w-sm w-full mx-4 border border-white/10 shadow-2xl">
          <div className="flex flex-col items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-600 to-purple-600 p-0.5">
              <div className="w-full h-full rounded-full bg-surface-900 flex items-center justify-center overflow-hidden">
                {callerAvatar ? (
                  <img src={callerAvatar} alt={callerName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-accent-400">
                    {callerName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Call info */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">{callerName}</h2>
              <div className="flex items-center justify-center gap-2">
                {callType === "video" ? (
                  <>
                    <Video className="w-4 h-4 text-accent-400" />
                    <p className="text-surface-400">Incoming video call</p>
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4 text-accent-400" />
                    <p className="text-surface-400">Incoming audio call</p>
                  </>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-4 pt-4 w-full">
              <button
                onClick={handleRejectCall}
                className="flex-1 py-3 rounded-2xl bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 transition font-semibold flex items-center justify-center gap-2"
              >
                <PhoneOff className="w-5 h-5" />
                Reject
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:opacity-90 transition font-semibold flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" />
                Accept
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Outgoing call screen (caller waiting for response)
  if (!isActive && !isIncoming) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-surface-900 to-surface-950 rounded-3xl p-8 max-w-sm w-full mx-4 border border-white/10 shadow-2xl">
          <div className="flex flex-col items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-600 to-purple-600 p-0.5 animate-pulse">
              <div className="w-full h-full rounded-full bg-surface-900 flex items-center justify-center overflow-hidden">
                {callerAvatar ? (
                  <img src={callerAvatar} alt={callerName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-accent-400">
                    {callerName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Call info */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">{callerName}</h2>
              <div className="flex items-center justify-center gap-2">
                {callType === "video" ? (
                  <>
                    <Video className="w-4 h-4 text-accent-400" />
                    <p className="text-surface-400">Calling with video…</p>
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4 text-accent-400" />
                    <p className="text-surface-400">Calling…</p>
                  </>
                )}
              </div>
            </div>

            {/* Cancel button */}
            <div className="flex gap-4 pt-4 w-full">
              <button
                onClick={handleEndCall}
                className="flex-1 py-3 rounded-2xl bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 transition font-semibold flex items-center justify-center gap-2"
              >
                <PhoneOff className="w-5 h-5" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active call screen
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {/* Video streams */}
      {callType === "video" && (
        <>
          {/* Remote video (large) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Local video (picture-in-picture) */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-6 right-6 w-32 h-32 rounded-2xl bg-black border-2 border-white/20 object-cover"
          />
        </>
      )}

      {/* Audio-only UI */}
      {callType === "audio" && (
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-accent-600 to-purple-600 p-0.5 animate-pulse">
            <div className="w-full h-full rounded-full bg-surface-900 flex items-center justify-center overflow-hidden">
              {callerAvatar ? (
                <img src={callerAvatar} alt={callerName} className="w-full h-full object-cover" />
              ) : (
                <div className="text-5xl font-bold text-accent-400">
                  {callerName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-2">{callerName}</h2>
            <p className="text-surface-400 text-lg">{formatDuration(duration)}</p>
            {connectionState !== "connected" && (
              <p className="text-accent-300 text-sm mt-2 animate-pulse">{connectionState}…</p>
            )}
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-between p-8 pointer-events-none">
        {/* Top: Call duration */}
        <div className="text-white text-center pointer-events-auto">
          <p className="text-lg font-semibold">{formatDuration(duration)}</p>
        </div>

        {/* Bottom: Control buttons */}
        <div className="flex items-center justify-center gap-4 pointer-events-auto">
          {/* Mute button */}
          <button
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isMuted
                ? "bg-rose-600 text-white"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>

          {/* Video toggle (only for video calls) */}
          {callType === "video" && (
            <button
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isVideoOff
                  ? "bg-rose-600 text-white"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              {isVideoOff ? (
                <VideoOff className="w-6 h-6" />
              ) : (
                <Video className="w-6 h-6" />
              )}
            </button>
          )}

          {/* End call button */}
          <button
            onClick={handleEndCall}
            className="w-14 h-14 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-all flex items-center justify-center"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
