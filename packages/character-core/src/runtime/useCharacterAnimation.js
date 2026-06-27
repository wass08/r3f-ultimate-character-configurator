import { useAnimations } from "@react-three/drei";
import { useEffect, useRef } from "react";
import { LoopRepeat } from "three";
import { useCharacterStore } from "../actions/characterStore";
import { usePreviewStore } from "./previewStore";

// Shared animation driver for any character body — the base mesh or an exported
// character GLB. Binds the Poses.glb clips to `group`, crossfades to the action
// pose, and lets a live-preview clip override the pose until cleared. Works on
// either body because both carry the same `mixamorig:` skeleton the clips target.
export function useCharacterAnimation(group, animations) {
  const { actions, mixer } = useAnimations(animations, group);
  const pose = useCharacterStore((s) => s.current.pose);
  const previewClip = usePreviewStore((s) => s.clip);
  const poseActionRef = useRef(null);

  // Event-driven pose playback — suspended while a preview clip owns the mixer.
  useEffect(() => {
    if (previewClip) return;
    const next = actions[pose] || actions.Idle;
    if (!next) return;
    next.reset().fadeIn(0.25).play();
    if (poseActionRef.current && poseActionRef.current !== next) {
      poseActionRef.current.fadeOut(0.25);
    }
    poseActionRef.current = next;
  }, [actions, pose, previewClip]);

  // Live preview overrides the pose; clearing it (previewClip → null) re-runs the
  // effect above and resumes the current pose.
  useEffect(() => {
    if (!previewClip || !mixer) return;
    const action = mixer.clipAction(previewClip, group.current);
    action.reset().setLoop(LoopRepeat, Infinity).fadeIn(0.3).play();
    poseActionRef.current?.fadeOut(0.3);
    return () => {
      action.fadeOut(0.3);
      setTimeout(() => {
        action.stop();
        mixer.uncacheAction?.(previewClip, group.current);
      }, 350);
    };
  }, [previewClip, mixer]);

  return { actions, mixer };
}
