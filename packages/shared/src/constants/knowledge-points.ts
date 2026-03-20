export type KnowledgePointTreeNode = {
  name: string;
  category: string;
  subPoints: string[];
};

export const knowledgePointsTree: KnowledgePointTreeNode[] = [
  {
    name: "力学",
    category: "高中物理",
    subPoints: [
      "质点运动学",
      "牛顿运动定律",
      "力的合成与分解",
      "曲线运动与圆周运动",
      "动量守恒",
      "机械能守恒",
    ],
  },
  {
    name: "热学",
    category: "高中物理",
    subPoints: ["分子动理论", "热力学定律", "气体状态方程"],
  },
  {
    name: "电磁学",
    category: "高中物理",
    subPoints: ["静电场", "电路", "磁场", "电磁感应", "交变电流"],
  },
  {
    name: "光学",
    category: "高中物理",
    subPoints: ["光的反射折射", "光的干涉衍射偏振"],
  },
  {
    name: "近代物理",
    category: "高中物理",
    subPoints: ["量子力学基础", "核物理"],
  },
];

export type KnowledgePointGroup = {
  chapter: string;
  items: string[];
};

export const knowledgePointGroups: KnowledgePointGroup[] = knowledgePointsTree.map((node) => ({
  chapter: node.name,
  items: node.subPoints,
}));

export const allKnowledgePoints = knowledgePointsTree.flatMap((node) => node.subPoints);
