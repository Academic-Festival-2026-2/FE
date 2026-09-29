import type { Project } from "../types/project";

export const projects: Project[] = [
  {
    id: "project-01",
    title: "프로젝트 이름을 정해주세요",
    description: "도메인 기능이 구체화되면 이 샘플 데이터를 API 응답으로 교체합니다.",
    owner: "FE team",
    status: "in-progress",
    updatedAt: "오늘",
  },
  {
    id: "project-02",
    title: "사용자 흐름 설계",
    description: "라우트와 페이지의 경계를 먼저 잡고 세부 기능을 붙입니다.",
    owner: "Product team",
    status: "planning",
    updatedAt: "어제",
  },
  {
    id: "project-03",
    title: "첫 번째 결과물",
    description: "완료된 작업은 이곳에서 한눈에 확인할 수 있습니다.",
    owner: "Design team",
    status: "done",
    updatedAt: "9월 25일",
  },
];
