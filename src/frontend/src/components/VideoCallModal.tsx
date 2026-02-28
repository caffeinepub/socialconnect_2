import { Button } from "@/components/ui/button";
import type { Principal } from "@icp-sdk/core/principal";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { UserAvatar } from "./UserAvatar";

type CallStatus =
  | "connecting"
  | "calling"
  | "ringing"
  | "connected"
  | "ended"
  | "declined";

// ── Shared helpers ────────────────────────────────────────────────────────

function stopTracks(stream: MediaStream | null) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

function addTracksToPC(stream: MediaStream, pc: RTCPeerConnection) {
  for (const track of stream.getTracks()) {
    pc.addTrack(track, stream);
  }
}

// ── Video Call Controls ───────────────────────────────────────────────────

interface ControlsProps {
  isMuted: boolean;
  isCameraOff: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onHangUp: () => void;
}

function CallControls({
  isMuted,
  isCameraOff,
  onToggleMic,
  onToggleCamera,
  onHangUp,
}: ControlsProps) {
  return (
    <div className="h-24 bg-black/80 backdrop-blur-sm flex items-center justify-center gap-6">
      <button
        type="button"
        onClick={onToggleMic}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          isMuted
            ? "bg-red-500/20 text-red-400"
            : "bg-white/10 text-white hover:bg-white/20"
        }`}
      >
        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      <Button
        onClick={onHangUp}
        className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg"
      >
        <PhoneOff className="w-6 h-6 text-white" />
      </Button>

      <button
        type="button"
        onClick={onToggleCamera}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          isCameraOff
            ? "bg-red-500/20 text-red-400"
            : "bg-white/10 text-white hover:bg-white/20"
        }`}
      >
        {isCameraOff ? (
          <VideoOff className="w-5 h-5" />
        ) : (
          <Video className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}

// ── Video Stage ───────────────────────────────────────────────────────────

interface VideoStageProps {
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  status: CallStatus;
  isCameraOff: boolean;
  profile: UserProfile | null;
}

const statusLabel: Record<CallStatus, string> = {
  connecting: "Connecting...",
  calling: "Calling...",
  ringing: "Ringing...",
  connected: "Connected",
  ended: "Call ended",
  declined: "Call declined",
};

function VideoStage({
  remoteVideoRef,
  localVideoRef,
  status,
  isCameraOff,
  profile,
}: VideoStageProps) {
  return (
    <div className="flex-1 relative flex items-center justify-center bg-gray-900">
      {/* biome-ignore lint/a11y/useMediaCaption: live video call stream does not require captions */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
        style={{ display: status === "connected" ? "block" : "none" }}
      />

      {status !== "connected" && (
        <div className="flex flex-col items-center gap-4 text-white">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white/20">
            <UserAvatar profile={profile} size="xl" />
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-bold">
              {profile?.displayName ?? "Friend"}
            </p>
            <motion.p
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
              className="text-white/70 mt-1 text-sm"
            >
              {statusLabel[status]}
            </motion.p>
          </div>
        </div>
      )}

      {status === "connected" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
          <span className="text-white text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Connected
          </span>
        </div>
      )}

      {/* Local video PiP */}
      <motion.div
        drag
        dragMomentum={false}
        className="absolute bottom-24 right-4 w-28 h-36 md:w-36 md:h-48 rounded-xl overflow-hidden ring-2 ring-white/30 cursor-grab active:cursor-grabbing bg-gray-800"
      >
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isCameraOff ? "opacity-0" : ""}`}
        />
        {isCameraOff && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <VideoOff className="w-8 h-8 text-white/50" />
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Outgoing Call Modal ───────────────────────────────────────────────────

interface VideoCallModalProps {
  friendPrincipal: Principal;
  friendProfile: UserProfile | null;
  onClose: () => void;
}

export function VideoCallModal({
  friendPrincipal,
  friendProfile,
  onClose,
}: VideoCallModalProps) {
  const { identity } = useInternetIdentity();
  const { actor } = useActor();

  const [status, setStatus] = useState<CallStatus>("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callIdRef = useRef<string>("");
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const myPrincipal = identity?.getPrincipal();

  const cleanup = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    stopTracks(localStreamRef.current);
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current = null;
  }, []);

  const hangUp = useCallback(async () => {
    cleanup();
    setStatus("ended");

    const anyActor = actor as any;
    if (anyActor && callIdRef.current) {
      try {
        await anyActor.endCall(callIdRef.current);
      } catch {
        // ignore
      }
    }
    setTimeout(() => onCloseRef.current(), 1200);
  }, [actor, cleanup]);

  useEffect(() => {
    if (!actor || !myPrincipal) return;

    const anyActor = actor as any;
    const cId = `${myPrincipal.toString()}-${friendPrincipal.toString()}`;
    callIdRef.current = cId;
    let cancelled = false;

    const startCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) {
          stopTracks(stream);
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;
        addTracksToPC(stream, pc);

        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") {
            setStatus("connected");
          } else if (
            pc.connectionState === "disconnected" ||
            pc.connectionState === "failed"
          ) {
            setStatus("ended");
            cleanup();
            setTimeout(() => onCloseRef.current(), 1200);
          }
        };

        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            try {
              await anyActor.addICECandidate(
                cId,
                JSON.stringify(event.candidate),
                myPrincipal,
              );
            } catch {
              // ignore
            }
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await anyActor.createOffer(offer.sdp ?? "", friendPrincipal);
        setStatus("calling");

        const processedCandidates = new Set<string>();
        pollIntervalRef.current = setInterval(async () => {
          if (!anyActor || cancelled) return;
          try {
            if (pc.remoteDescription === null) {
              const answer = await anyActor.getCallAnswer(cId);
              if (answer) {
                await pc.setRemoteDescription(
                  new RTCSessionDescription({
                    type: "answer",
                    sdp: answer.sdp,
                  }),
                );
              }
            }

            const candidates = await anyActor.getCallCandidates(cId);
            for (const c of candidates) {
              const key = c.candidate;
              if (
                !processedCandidates.has(key) &&
                c.tenant.toString() !== myPrincipal.toString()
              ) {
                processedCandidates.add(key);
                try {
                  const parsed = JSON.parse(c.candidate);
                  await pc.addIceCandidate(new RTCIceCandidate(parsed));
                } catch {
                  // ignore malformed
                }
              }
            }
          } catch {
            // ignore poll errors
          }
        }, 2000);
      } catch {
        if (!cancelled) {
          toast.error("Could not access camera/microphone");
          setStatus("ended");
          setTimeout(() => onCloseRef.current(), 1000);
        }
      }
    };

    startCall();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [actor, myPrincipal, friendPrincipal, cleanup]);

  const toggleMic = () => {
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getAudioTracks()) {
        t.enabled = isMuted;
      }
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getVideoTracks()) {
        t.enabled = isCameraOff;
      }
      setIsCameraOff(!isCameraOff);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-black"
      >
        <VideoStage
          remoteVideoRef={remoteVideoRef}
          localVideoRef={localVideoRef}
          status={status}
          isCameraOff={isCameraOff}
          profile={friendProfile}
        />
        <CallControls
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onHangUp={hangUp}
        />
      </motion.div>
    </AnimatePresence>
  );
}

// ── Incoming Call Banner ──────────────────────────────────────────────────

interface IncomingCallBannerProps {
  callerPrincipal: Principal;
  callerProfile: UserProfile | null;
  callId: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallBanner({
  callerProfile,
  onAccept,
  onDecline,
}: IncomingCallBannerProps) {
  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden shadow-2xl"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.18 0.04 260), oklch(0.12 0.06 265))",
        border: "1px solid oklch(0.35 0.12 260)",
      }}
    >
      <div className="p-4 flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/30">
            <UserAvatar profile={callerProfile} size="md" />
          </div>
          <motion.div
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
            className="absolute inset-0 rounded-full ring-2 ring-green-400/50"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-display font-semibold text-sm truncate">
            {callerProfile?.displayName ?? "Someone"}
          </p>
          <p className="text-white/60 text-xs">Incoming video call</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onDecline}
            className="w-9 h-9 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/40 transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="w-9 h-9 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center hover:bg-green-500/40 transition-colors"
          >
            <Video className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Callee Call Modal ─────────────────────────────────────────────────────

interface CalleeCallModalProps {
  callerPrincipal: Principal;
  callerProfile: UserProfile | null;
  incomingCallId: string;
  onClose: () => void;
}

export function CalleeCallModal({
  callerProfile,
  incomingCallId,
  onClose,
}: CalleeCallModalProps) {
  const { identity } = useInternetIdentity();
  const { actor } = useActor();

  const [status, setStatus] = useState<CallStatus>("connected");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const myPrincipal = identity?.getPrincipal();

  const cleanup = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    stopTracks(localStreamRef.current);
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current = null;
  }, []);

  const hangUp = useCallback(async () => {
    cleanup();
    setStatus("ended");

    const anyActor = actor as any;
    if (anyActor && incomingCallId) {
      try {
        await anyActor.endCall(incomingCallId);
      } catch {
        // ignore
      }
    }
    setTimeout(() => onCloseRef.current(), 1200);
  }, [actor, cleanup, incomingCallId]);

  useEffect(() => {
    if (!actor || !myPrincipal) return;

    const anyActor = actor as any;
    let cancelled = false;

    const answerCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) {
          stopTracks(stream);
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const offerData = await anyActor.getCallOffer(incomingCallId);
        if (!offerData) {
          toast.error("Call offer not found");
          onCloseRef.current();
          return;
        }

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;
        addTracksToPC(stream, pc);

        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") {
            setStatus("connected");
          } else if (
            pc.connectionState === "disconnected" ||
            pc.connectionState === "failed"
          ) {
            setStatus("ended");
            cleanup();
            setTimeout(() => onCloseRef.current(), 1200);
          }
        };

        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            try {
              await anyActor.addICECandidate(
                incomingCallId,
                JSON.stringify(event.candidate),
                myPrincipal,
              );
            } catch {
              // ignore
            }
          }
        };

        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: "offer", sdp: offerData.sdp }),
        );
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await anyActor.answerCall(incomingCallId, answer.sdp ?? "");
        setStatus("connected");

        const processedCandidates = new Set<string>();
        pollIntervalRef.current = setInterval(async () => {
          if (!anyActor || cancelled) return;
          try {
            const candidates = await anyActor.getCallCandidates(incomingCallId);
            for (const c of candidates) {
              const key = c.candidate;
              if (
                !processedCandidates.has(key) &&
                c.tenant.toString() !== myPrincipal.toString()
              ) {
                processedCandidates.add(key);
                try {
                  const parsed = JSON.parse(c.candidate);
                  await pc.addIceCandidate(new RTCIceCandidate(parsed));
                } catch {
                  // ignore
                }
              }
            }

            const callOffer = await anyActor.getCallOffer(incomingCallId);
            if (callOffer === null) {
              setStatus("ended");
              cleanup();
              setTimeout(() => onCloseRef.current(), 1200);
            }
          } catch {
            // ignore
          }
        }, 2000);
      } catch {
        if (!cancelled) {
          toast.error("Could not access camera/microphone");
          setStatus("ended");
          setTimeout(() => onCloseRef.current(), 1000);
        }
      }
    };

    answerCall();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [actor, myPrincipal, incomingCallId, cleanup]);

  const toggleMic = () => {
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getAudioTracks()) {
        t.enabled = isMuted;
      }
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getVideoTracks()) {
        t.enabled = isCameraOff;
      }
      setIsCameraOff(!isCameraOff);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-black"
      >
        <VideoStage
          remoteVideoRef={remoteVideoRef}
          localVideoRef={localVideoRef}
          status={status}
          isCameraOff={isCameraOff}
          profile={callerProfile}
        />
        <CallControls
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onHangUp={hangUp}
        />
      </motion.div>
    </AnimatePresence>
  );
}
