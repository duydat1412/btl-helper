import type { PageKey } from "../../src/data";
import LearningApp from "../../src/App";

export default function LearningRoute({ page }: { page: PageKey }) {
  return <LearningApp page={page} />;
}
