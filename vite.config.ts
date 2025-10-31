import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    base: "/you-suck-at-streaming-x/",
    plugins: [
        react({
            babel: {
                plugins: [["babel-plugin-react-compiler", {}]],
            },
        }),
    ],
});
