"use client";

import { useEffect, useRef, type ReactNode } from "react";

export type DrawerPosition = "left" | "right";

export interface DrawerProps {
  /** 是否显示抽屉 */
  open: boolean;
  /** 关闭抽屉的回调 */
  onClose: () => void;
  /** 抽屉位置 */
  position?: DrawerPosition;
  /** 抽屉宽度 */
  width?: string;
  /** 抽屉标题 */
  title?: string;
  /** 抽屉内容 */
  children: ReactNode;
  /** 是否显示遮罩层 */
  showOverlay?: boolean;
  /** 是否在关闭时销毁内容 */
  destroyOnClose?: boolean;
}

/**
 * 抽屉组件 - 从侧边滑出的面板
 */
export function Drawer({
  open,
  onClose,
  position = "right",
  width = "480px",
  title,
  children,
  showOverlay = true,
  destroyOnClose = false,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // 处理 ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // 处理点击遮罩关闭
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 处理点击事件传播
  const handleDrawerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 防止 body 滚动
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // 渲染内容
  const renderContent = () => {
    if (destroyOnClose && !open) {
      return null;
    }

    return (
      <>
        {showOverlay && open && (
          <div className="drawer-overlay" onClick={handleOverlayClick}>
            <div
              ref={drawerRef}
              className={`drawer drawer-${position} ${open ? "open" : ""}`}
              style={{ width }}
              onClick={handleDrawerClick}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? "drawer-title" : undefined}
            >
              <div className="drawer-header">
                {title && (
                  <h3 id="drawer-title" className="drawer-title">
                    {title}
                  </h3>
                )}
                <button
                  className="drawer-close"
                  onClick={onClose}
                  aria-label="关闭"
                  type="button"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="drawer-body">{children}</div>
            </div>
          </div>
        )}

        {/* 单独的遮罩层渲染，用于动画过渡 */}
        {!showOverlay && open && (
          <div className="drawer-overlay" onClick={handleOverlayClick}>
            <div
              ref={drawerRef}
              className={`drawer drawer-${position} ${open ? "open" : ""}`}
              style={{ width }}
              onClick={handleDrawerClick}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? "drawer-title" : undefined}
            >
              <div className="drawer-header">
                {title && (
                  <h3 id="drawer-title" className="drawer-title">
                    {title}
                  </h3>
                )}
                <button
                  className="drawer-close"
                  onClick={onClose}
                  aria-label="关闭"
                  type="button"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="drawer-body">{children}</div>
            </div>
          </div>
        )}
      </>
    );
  };

  return renderContent();
}
