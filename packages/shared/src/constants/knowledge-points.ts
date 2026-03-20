export type KnowledgePointGroup = {
  chapter: string;
  items: string[];
};

export const knowledgePointGroups: KnowledgePointGroup[] = [
  {
    chapter: "运动学",
    items: ["匀变速直线运动", "自由落体运动", "运动图像分析"],
  },
  {
    chapter: "力与牛顿定律",
    items: ["受力分析", "牛顿第二定律", "摩擦力综合应用"],
  },
  {
    chapter: "机械能与动量",
    items: ["功和功率", "机械能守恒", "动量守恒定律"],
  },
  {
    chapter: "电场与电路",
    items: ["电场强度", "欧姆定律", "闭合电路欧姆定律"],
  },
  {
    chapter: "电磁感应",
    items: ["法拉第电磁感应", "楞次定律", "感应电流综合题"],
  },
];

export const allKnowledgePoints = knowledgePointGroups.flatMap((group) => group.items);
