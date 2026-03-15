"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";

interface ChartProps {
  option: EChartsOption;
  height?: number | string;
  width?: number | string;
  className?: string;
}

export function Chart({ option, height = 300, width = "100%", className = "" }: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // 初始化图表
    chartInstance.current = echarts.init(chartRef.current);

    // 设置选项
    chartInstance.current.setOption(option);

    // 响应式调整
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener("resize", handleResize);

    // 清理
    return () => {
      window.removeEventListener("resize", handleResize);
      chartInstance.current?.dispose();
    };
  }, [option]);

  return (
    <div
      ref={chartRef}
      className={className}
      style={{
        width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
    />
  );
}

// 预设折线图配置
export function getLineChartOption(
  xData: string[],
  seriesData: number[],
  seriesName: string = "数量",
  color: string = "#3b82f6"
): EChartsOption {
  return {
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "#e5e7eb",
      borderWidth: 1,
      textStyle: {
        color: "#374151",
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "10%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: xData,
      axisLine: {
        lineStyle: {
          color: "#e5e7eb",
        },
      },
      axisLabel: {
        color: "#6b7280",
        fontSize: 11,
      },
    },
    yAxis: {
      type: "value",
      axisLine: {
        show: false,
      },
      axisLabel: {
        color: "#6b7280",
        fontSize: 11,
      },
      splitLine: {
        lineStyle: {
          color: "#f3f4f6",
        },
      },
    },
    series: [
      {
        name: seriesName,
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: {
          color: color,
          width: 2,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `${color}33` },
            { offset: 1, color: `${color}08` },
          ]),
        },
        itemStyle: {
          color: color,
        },
        data: seriesData,
      },
    ],
  };
}

// 预设柱状图配置
export function getBarChartOption(
  xData: string[],
  seriesData: number[],
  seriesName: string = "数量",
  color: string = "#3b82f6"
): EChartsOption {
  return {
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "#e5e7eb",
      borderWidth: 1,
      textStyle: {
        color: "#374151",
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "10%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: xData,
      axisLine: {
        lineStyle: {
          color: "#e5e7eb",
        },
      },
      axisLabel: {
        color: "#6b7280",
        fontSize: 11,
      },
    },
    yAxis: {
      type: "value",
      axisLine: {
        show: false,
      },
      axisLabel: {
        color: "#6b7280",
        fontSize: 11,
      },
      splitLine: {
        lineStyle: {
          color: "#f3f4f6",
        },
      },
    },
    series: [
      {
        name: seriesName,
        type: "bar",
        barMaxWidth: 40,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: color },
            { offset: 1, color: `${color}99` },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        data: seriesData,
      },
    ],
  };
}

// 组合折线+柱状图（用于展示创建和完成数）
export function getComboChartOption(
  xData: string[],
  barData: number[],
  lineData: number[],
  barName: string = "创建",
  lineName: string = "完成",
  barColor: string = "#3b82f6",
  lineColor: string = "#10b981"
): EChartsOption {
  return {
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "#e5e7eb",
      borderWidth: 1,
      textStyle: {
        color: "#374151",
      },
    },
    legend: {
      data: [barName, lineName],
      top: 0,
      right: 0,
      textStyle: {
        color: "#6b7280",
        fontSize: 11,
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "15%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: xData,
      axisLine: {
        lineStyle: {
          color: "#e5e7eb",
        },
      },
      axisLabel: {
        color: "#6b7280",
        fontSize: 11,
      },
    },
    yAxis: [
      {
        type: "value",
        name: barName,
        axisLine: {
          show: false,
        },
        axisLabel: {
          color: "#6b7280",
          fontSize: 11,
        },
        splitLine: {
          lineStyle: {
            color: "#f3f4f6",
          },
        },
      },
      {
        type: "value",
        name: lineName,
        axisLine: {
          show: false,
        },
        axisLabel: {
          color: "#6b7280",
          fontSize: 11,
        },
        splitLine: {
          show: false,
        },
      },
    ],
    series: [
      {
        name: barName,
        type: "bar",
        barMaxWidth: 30,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: barColor },
            { offset: 1, color: `${barColor}99` },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        data: barData,
      },
      {
        name: lineName,
        type: "line",
        yAxisIndex: 1,
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: {
          color: lineColor,
          width: 2,
        },
        itemStyle: {
          color: lineColor,
        },
        data: lineData,
      },
    ],
  };
}
