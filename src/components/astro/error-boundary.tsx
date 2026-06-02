"use client";
import React from "react";

interface State { hasError: boolean; }

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // 仅记录日志，不阻断渲染
    console.warn("[ErrorBoundary caught]", error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? this.props.children;
    }
    return this.props.children;
  }
}
