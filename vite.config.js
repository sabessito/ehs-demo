import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages 프로젝트 사이트 경로.
// 저장소 이름이 "ehs-demo"라면 base는 "/ehs-demo/" 여야 한다.
// 저장소 이름을 바꾸면 아래 값도 똑같이 바꿀 것.
export default defineConfig({
  plugins: [react()],
  base: "/ehs-demo/",
});
