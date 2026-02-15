"use client";

import { useEffect } from "react";
import { AnimationHelper } from "../helpers/AnimationHelper";

export function Animate() {
  useEffect(() => {
    AnimationHelper.init();
    return () => { AnimationHelper.destroy(); };
  }, []);

  return null;
}
