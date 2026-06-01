"use client";

import {
  Activity,
  BookOpen,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  Database,
  FileCode2,
  GitBranch,
  GraduationCap,
  Layers3,
  Lock,
  Moon,
  Network,
  PlayCircle,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Sun,
  TimerReset,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  dbTables,
  lifecycleStates,
  mavenModules,
  milestones,
  placeBidFlow,
  readiness,
  redZones,
  rolePaths,
  scenarioFlows,
  theoryTopics,
  testCases,
  type PageKey,
  type RoleKey,
  type StudyStatus,
} from "./data";
import {
  generatedAt,
  generatedManualCases,
  projectLabel,
  projectCodeFiles,
  type GeneratedCodeFile,
  type GeneratedManualCase,
} from "./generatedProjectData";
import {
  curatedInterviewQuestions,
  type CuratedInterviewQuestion,
} from "./curatedInterviewQuestions";

const nav = [
  { key: "dashboard", label: "Learning Cockpit", icon: GraduationCap, href: "/" },
  { key: "roles", label: "Role paths", icon: Users, href: "/roles" },
  { key: "flows", label: "Visualize", icon: GitBranch, href: "/visualize" },
  { key: "code", label: "Code map", icon: FileCode2, href: "/code-map" },
  { key: "theory", label: "Theory library", icon: BookOpen, href: "/theory" },
  { key: "tests", label: "Test lab", icon: ClipboardCheck, href: "/test-lab" },
  { key: "interview", label: "Vấn đáp", icon: Sparkles, href: "/interview" },
] satisfies { key: PageKey; label: string; icon: typeof GraduationCap; href: string }[];

const routeByPage = Object.fromEntries(nav.map((item) => [item.key, item.href])) as Record<PageKey, string>;

const iconByLane = {
  Client: Code2,
  Socket: Network,
  Service: Layers3,
  Repository: Database,
  Realtime: Activity,
};

const statusLabel: Record<StudyStatus, string> = {
  done: "Đã nắm",
  review: "Cần ôn",
  risk: "Rủi ro vấn đáp",
};

const statusClass: Record<StudyStatus, string> = {
  done: "status-done",
  review: "status-review",
  risk: "status-risk",
};

const interviewFilters = ["All", "Flow", "Design", "SOLID", "Pattern", "Debug", "Test", "Line code"] as const;
const flowStepFilters = ["All", "Client", "UI", "Socket", "Protocol", "Service", "Repository", "Realtime", "Test", "Build"] as const;
type ThemeMode = "light" | "dark";
type ScenarioFlowItem = (typeof scenarioFlows)[number];
type ScenarioStepItem = ScenarioFlowItem["steps"][number];

export default function LearningApp({ page }: { page: PageKey }) {
  const router = useRouter();
  const [role, setRole] = useState<RoleKey>("Bidder");
  const [query, setQuery] = useState("");
  const [activeQuestionId, setActiveQuestionId] = useState(curatedInterviewQuestions[0]?.id ?? "");
  const [showAnswer, setShowAnswer] = useState(false);
  const [lockMode, setLockMode] = useState<"race" | "locked">("locked");
  const [scenarioId, setScenarioId] = useState(scenarioFlows[0]?.id ?? "");
  const [expandedScenarioStep, setExpandedScenarioStep] = useState(scenarioFlows[0]?.steps[0]?.id ?? "");
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [preferencesReady, setPreferencesReady] = useState(false);

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const currentRole = rolePaths.find((item) => item.role === role)!;
  const currentQuestion = curatedInterviewQuestions.find((item) => item.id === activeQuestionId) ?? curatedInterviewQuestions[0];

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("btl-viva-theme");
      const savedProgress = localStorage.getItem("btl-viva-progress");
      setTheme(savedTheme === "dark" ? "dark" : "light");
      setChecked(savedProgress ? JSON.parse(savedProgress) as Record<string, boolean> : {});
    } catch {
      setTheme("light");
      setChecked({});
    } finally {
      setPreferencesReady(true);
    }
  }, []);

  useEffect(() => {
    if (!activeQuestionId && curatedInterviewQuestions[0]) {
      setActiveQuestionId(curatedInterviewQuestions[0].id);
    }
  }, [activeQuestionId]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    if (!preferencesReady) return;
    localStorage.setItem("btl-viva-theme", theme);
  }, [preferencesReady, theme]);

  useEffect(() => {
    if (!preferencesReady) return;
    localStorage.setItem("btl-viva-progress", JSON.stringify(checked));
  }, [checked, preferencesReady]);

  const filteredFiles = useMemo(() => {
    if (!deferredQuery) return projectCodeFiles;
    return projectCodeFiles.filter((file) =>
      [
        file.path,
        file.layer,
        file.module,
        file.summary,
        ...file.methods.map((method) => `${method.name} ${method.code}`),
        ...file.importantLines.map((line) => `${line.line} ${line.code} ${line.explain}`),
      ]
        .join(" ")
        .toLowerCase()
        .includes(deferredQuery),
    );
  }, [deferredQuery]);

  const filteredTopics = useMemo(() => {
    if (!deferredQuery) return theoryTopics;
    return theoryTopics.filter((topic) =>
      [topic.title, topic.category, topic.summary, topic.projectExample, ...topic.files]
        .join(" ")
        .toLowerCase()
        .includes(deferredQuery),
    );
  }, [deferredQuery]);

  function toggleProgress(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function navigateToPage(nextPage: PageKey) {
    router.push(routeByPage[nextPage]);
  }

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  const ThemeIcon = theme === "dark" ? Sun : Moon;

  return (
    <div className="app-shell" data-theme={theme}>
      <a className="skip-link" href="#main-content">
        Bỏ qua điều hướng
      </a>
      <aside className="sidebar" aria-label="Điều hướng chính">
        <div className="brand">
          <div className="brand-mark">
            <img src="/ltnc-cat.png" alt="" className="brand-logo" />
          </div>
          <div>
            <strong>BTL Viva Helper</strong>
            <span>{projectLabel}</span>
          </div>
        </div>

        <nav className="nav-list">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                className={page === item.key ? "nav-item active" : "nav-item"}
                href={item.href}
              >
                <Icon size={18} aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button className="theme-toggle sidebar-theme-toggle" type="button" onClick={toggleTheme} aria-label="Đổi light/dark mode">
          <ThemeIcon size={17} aria-hidden />
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>

        <div className="sidebar-note">
          <span className="eyebrow">Project source</span>
          <code>{projectLabel}</code>
        </div>
      </aside>

      <main id="main-content" className="main-content">
        <TopBar query={query} setQuery={setQuery} />
        {page === "dashboard" && (
          <Dashboard checked={checked} toggleProgress={toggleProgress} setActivePage={navigateToPage} theme={theme} />
        )}
        {page === "roles" && <Roles role={role} setRole={setRole} currentRole={currentRole} />}
        {page === "flows" && (
          <Visualize
            lockMode={lockMode}
            setLockMode={setLockMode}
            setActivePage={navigateToPage}
            scenarioId={scenarioId}
            setScenarioId={setScenarioId}
            expandedScenarioStep={expandedScenarioStep}
            setExpandedScenarioStep={setExpandedScenarioStep}
          />
        )}
        {page === "code" && <CodeMap files={filteredFiles} query={query} setQuery={setQuery} />}
        {page === "theory" && <Theory topics={filteredTopics} />}
        {page === "tests" && <Tests checked={checked} toggleProgress={toggleProgress} />}
        {page === "interview" && (
          <Interview
            question={currentQuestion}
            questionId={currentQuestion?.id ?? activeQuestionId}
            setQuestionId={setActiveQuestionId}
            showAnswer={showAnswer}
            setShowAnswer={setShowAnswer}
            questions={curatedInterviewQuestions}
          />
        )}
      </main>
    </div>
  );
}

function TopBar({
  query,
  setQuery,
}: {
  query: string;
  setQuery: (value: string) => void;
}) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Mục tiêu bảo vệ</p>
        <h1>Nhìn vào là học được luồng, code, test và lý thuyết</h1>
      </div>
      <div className="topbar-actions">
        <label className="search-box">
          <Search size={18} aria-hidden />
          <span className="sr-only">Tìm kiếm file, theory, test</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm: BidService, socket, Maven..."
            type="search"
          />
        </label>
      </div>
    </header>
  );
}

function Dashboard({
  checked,
  toggleProgress,
  setActivePage,
  theme,
}: {
  checked: Record<string, boolean>;
  toggleProgress: (id: string) => void;
  setActivePage: (page: PageKey) => void;
  theme: ThemeMode;
}) {
  const doneCount = Object.values(checked).filter(Boolean).length;
  const chartColors = theme === "dark"
    ? {
        axis: "#7d8794",
        grid: "#34445c",
        primary: "#7d91cc",
        cursor: "#243247",
        tooltipBg: "#172033",
        tooltipText: "#a7adb8",
      }
    : {
        axis: "#475569",
        grid: "#d9e2ec",
        primary: "#3157d5",
        cursor: "#eef4ff",
        tooltipBg: "#ffffff",
        tooltipText: "#111827",
      };
  const today = [
    { id: "todo-bid", label: "Giải thích PLACE_BID end-to-end", page: "flows" as PageKey },
    { id: "todo-concurrency", label: "Ôn race condition + anti-sniping", page: "theory" as PageKey },
    { id: "todo-tests", label: "Chạy và đọc BidServiceConcurrencyTest", page: "tests" as PageKey },
    { id: "todo-admin", label: "Tập demo role Admin và authorization", page: "roles" as PageKey },
  ];

  return (
    <section className="page-stack">
      <div className="hero-grid">
        <div className="panel intro-panel">
          <span className="eyebrow">Learning cockpit</span>
          <h2>Đường học cho cả nhóm, ưu tiên đúng điểm dễ bị hỏi xoáy.</h2>
          <p>
            App gom repo Java thành các mô-đun học: role, flow, code map, theory, test lab và bộ
            câu hỏi vấn đáp. Mỗi phần đều nối tới file thật, rule thật, test thật.
          </p>
          <div className="coverage-strip">
            <span><strong>{projectCodeFiles.length}</strong> file repo</span>
            <span><strong>{curatedInterviewQuestions.length}</strong> câu vấn đáp LLM-curated</span>
            <span><strong>{generatedManualCases.length}</strong> manual UI case</span>
            <span><strong>{new Date(generatedAt).toLocaleDateString("vi-VN")}</strong> ngày index</span>
          </div>
          <div className="quick-actions">
            <button className="primary-button" type="button" onClick={() => setActivePage("flows")}>
              <PlayCircle size={18} aria-hidden />
              Học flow PLACE_BID
            </button>
            <button className="ghost-button" type="button" onClick={() => setActivePage("interview")}>
              <Sparkles size={18} aria-hidden />
              Luyện vấn đáp
            </button>
          </div>
        </div>

        <div className="panel chart-panel">
          <div className="panel-title">
            <h3>Readiness radar</h3>
            <span>{doneCount} mục đã tick local</span>
          </div>
          <div className="radar-wrap">
            <ResponsiveContainer width="100%" height={245}>
              <RadarChart data={readiness}>
                <PolarGrid stroke={chartColors.grid} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: chartColors.axis, fontSize: 12 }} />
                <Radar dataKey="score" stroke={chartColors.primary} fill={chartColors.primary} fillOpacity={0.24} />
                <Tooltip
                  contentStyle={{ background: chartColors.tooltipBg, borderColor: chartColors.grid, color: chartColors.tooltipText }}
                  labelStyle={{ color: chartColors.tooltipText }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid two">
        <div className="panel">
          <div className="panel-title">
            <h3>Checklist hôm nay</h3>
            <span>chống rủi ro 0 điểm nhóm</span>
          </div>
          <div className="check-list">
            {today.map((item) => (
              <label key={item.id} className="check-row">
                <input
                  type="checkbox"
                  checked={Boolean(checked[item.id])}
                  onChange={() => toggleProgress(item.id)}
                />
                <span>{item.label}</span>
                <button type="button" onClick={() => setActivePage(item.page)}>
                  Mở
                </button>
              </label>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            <h3>Vùng đỏ cần ôn</h3>
            <span>ưu tiên trước buổi mock</span>
          </div>
          <ul className="risk-list">
            {redZones.map((zone) => (
              <li key={zone}>
                <ShieldCheck size={16} aria-hidden />
                <span>{zone}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <h3>Tiến độ theo năng lực</h3>
          <span>đọc nhanh để chia ca học</span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={milestones} layout="vertical" margin={{ left: 18, right: 28 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartColors.grid} />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: chartColors.axis }} />
            <YAxis dataKey="label" type="category" width={150} tick={{ fill: chartColors.axis, fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: chartColors.tooltipBg, borderColor: chartColors.grid, color: chartColors.tooltipText }}
              labelStyle={{ color: chartColors.tooltipText }}
              cursor={{ fill: chartColors.cursor }}
            />
            <Bar dataKey="value" fill={chartColors.primary} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Roles({
  role,
  setRole,
  currentRole,
}: {
  role: RoleKey;
  setRole: (role: RoleKey) => void;
  currentRole: (typeof rolePaths)[number];
}) {
  return (
    <section className="page-stack">
      <SectionHeader
        eyebrow="Role learning paths"
        title="Học theo vai: bidder, seller, admin"
        text="Mỗi role có quyền, màn hình, Action/Request khác nhau. Người học chọn role để nhìn journey end-to-end."
      />
      <div className="segmented" role="tablist" aria-label="Chọn role">
        {rolePaths.map((path) => (
          <button
            key={path.role}
            type="button"
            className={role === path.role ? "active" : ""}
            onClick={() => setRole(path.role)}
          >
            {path.role}
          </button>
        ))}
      </div>

      <div className="grid role-grid">
        <div className="panel">
          <div className="panel-title">
            <h3>{currentRole.role}</h3>
            <span>mục tiêu role</span>
          </div>
          <p className="lead">{currentRole.goal}</p>
          <h4>Quyền/message phải thuộc</h4>
          <div className="tag-cloud">
            {currentRole.permissions.map((permission) => (
              <code key={permission}>{permission}</code>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            <h3>Điểm vấn đáp</h3>
            <span>đừng học lướt</span>
          </div>
          <ul className="clean-list">
            {currentRole.mustKnow.map((item) => (
              <li key={item}>
                <CheckCircle2 size={16} aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <h3>Journey map</h3>
            <span>client to server to data</span>
        </div>
        <div className="journey">
          {currentRole.journey.map((step, index) => (
            <article key={step.step} className="journey-step">
              <span className="step-index">{index + 1}</span>
              <h4>{step.step}</h4>
              <p><strong>Client:</strong> {step.client}</p>
              <p><strong>Server:</strong> {step.server}</p>
              <p><strong>Data:</strong> {step.data}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function buildScenarioGuide(flow: ScenarioFlowItem) {
  const moduleLabels: Record<ScenarioStepItem["module"], string> = {
    client: "client/UI",
    common: "common contract/domain",
    server: "server/service",
  };
  const modules = uniqueSorted(flow.steps.map((step) => moduleLabels[step.module]));
  const fileOrder = flow.steps.map((step) => step.path).filter((path, index, arr) => arr.indexOf(path) === index).slice(0, 7);
  const serverSteps = flow.steps.filter((step) => step.module === "server").length;
  const clientSteps = flow.steps.filter((step) => step.module === "client").length;
  const hasCommon = flow.steps.some((step) => step.module === "common");

  return {
    narrative: `Bắt đầu bằng thao tác hoặc trigger của luồng, đi tuần tự qua ${modules.join(" -> ")}, rồi kết thúc bằng state/response/event mà người dùng nhìn thấy. Với luồng này có ${clientSteps} bước client, ${serverSteps} bước server${hasCommon ? " và contract common ở giữa" : ""}; khi nói cần chỉ rõ bước nào chỉ phục vụ UX, bước nào mới là nguồn sự thật nghiệp vụ.`,
    fileOrder,
    invariants: scenarioInvariants(flow),
  };
}

function scenarioInvariants(flow: ScenarioFlowItem) {
  const haystack = [flow.id, flow.title, flow.subtitle, ...flow.steps.flatMap((step) => [step.badge, step.title, step.summary, step.path])]
    .join(" ")
    .toLowerCase();
  const invariants: string[] = [];

  if (/bid|auto|sniping|auction/.test(haystack)) {
    invariants.push("Không được để currentPrice, highestBidderId hoặc AuctionStatus lệch nhau sau mỗi thao tác.");
  }
  if (/auth|login|register|authorization|admin|seller/.test(haystack)) {
    invariants.push("Client có thể ẩn/hiện màn, nhưng permission cuối cùng vẫn phải được kiểm ở server.");
  }
  if (/socket|realtime|notification|event|disconnect/.test(haystack)) {
    invariants.push("Event realtime phải phát sau khi state đã hợp lệ và UI phải cập nhật trên đúng JavaFX thread.");
  }
  if (/repository|datastore|persistence|serialization|auction_data/.test(haystack)) {
    invariants.push("Repository/DataStore chỉ là persistence boundary; business rule không được trôi sang UI hoặc common message.");
  }
  if (/maven|ci|test|demo/.test(haystack)) {
    invariants.push("Mọi khẳng định khi demo nên có test, command hoặc manual case làm bằng chứng.");
  }

  invariants.push("Khi trả lời, luôn nói input -> xử lý -> output -> lỗi nếu bước này sai.");
  return Array.from(new Set(invariants)).slice(0, 4);
}

function buildStepStudyDetails(step: ScenarioStepItem, flow: ScenarioFlowItem, index: number) {
  const previous = flow.steps[index - 1];
  const next = flow.steps[index + 1];
  const layerRule = layerRuleForStep(step);
  const proof = proofForStep(step);
  const script = `${step.title} là bước ${step.order} trong ${flow.label}. Input của bước này là ${step.input ?? "dữ liệu từ bước trước"}, nó chạy ở ${step.role ?? step.module} và nằm tại ${step.path}. Khi mở file, nói trước trách nhiệm: ${step.summary} Sau đó chỉ 1-2 line refs để chứng minh code thật, rồi nối sang ${next ? next.title : "kết quả cuối của flow"}. ${layerRule}`;

  return {
    script,
    checklist: [
      `Nêu trigger: ${step.trigger ?? "bước trước gọi sang hoặc user thao tác."}`,
      `Nêu input/output: ${step.input ?? "input từ flow"} -> ${step.output ?? "output sang bước kế tiếp"}.`,
      `Mở file ${step.path} và chỉ line refs chính.`,
      `Nối với ${previous ? `bước trước: ${previous.title}` : "điểm bắt đầu flow"} và ${next ? `bước sau: ${next.title}` : "điểm kết thúc flow"}.`,
    ],
    debug: [
      `Nếu lỗi, kiểm trước bước này có nhận đúng dữ liệu từ ${previous?.title ?? "UI/trigger"} không.`,
      step.failureMode ?? "Đối chiếu log/response/state để biết flow dừng ở layer nào.",
      `Sau khi sửa, chạy lại demo/test liên quan tới ${flow.label}.`,
    ],
    demo: [
      proof,
      `Manual demo: thao tác tới ${flow.label}, dừng ở bước ${step.order} và đọc state/response hiển thị.`,
      `Nếu có test, đọc theo Arrange-Act-Assert thay vì chỉ nói tên file.`,
    ],
    questions: [
      `Nếu bỏ bước ${step.title} thì flow ${flow.label} hỏng ở đâu?`,
      `Bước này thuộc UX, protocol, business rule hay persistence? Vì sao?`,
      "Lỗi ở đây sẽ hiện ra UI, response hay state persistence như thế nào?",
    ],
  };
}

function layerRuleForStep(step: ScenarioStepItem) {
  const haystack = [step.badge, step.layer, step.path, step.summary].join(" ").toLowerCase();
  if (/fxml|controller|ui|javafx|scene|shell/.test(haystack)) {
    return "Nhấn mạnh đây là lớp trình bày/điều hướng: validate nhanh và cập nhật UI, nhưng không quyết định rule auth hay tự sửa persistence.";
  }
  if (/protocol|message|request|response|contract|action/.test(haystack)) {
    return "Nhấn mạnh đây là contract chung: client và server phải cùng hiểu Action, payload Serializable và response wrapper.";
  }
  if (/router|handler|auth/.test(haystack)) {
    return "Nhấn mạnh đây là cổng server: ép kiểu payload, kiểm boundary và chỉ dispatch khi request hợp lệ.";
  }
  if (/service|rule|lock|scheduler|factory/.test(haystack)) {
    return "Nhấn mạnh đây là nơi business rule sống: giữ invariant, concurrency, scheduling và orchestration đúng thứ tự.";
  }
  if (/repository|datastore|serialization|persistence/.test(haystack)) {
    return "Nhấn mạnh đây là persistence boundary: đọc/ghi snapshot hoặc entity đúng cách, nhưng không tự sinh business rule.";
  }
  if (/event|notification|realtime|socket/.test(haystack)) {
    return "Nhấn mạnh socket/event chỉ phát sau khi state đã hợp lệ, và client phải phản ánh kết quả trên đúng thread UI.";
  }
  if (/test|ci|maven|pom/.test(haystack)) {
    return "Nhấn mạnh đây là bằng chứng chất lượng: command/test chứng minh flow không chỉ chạy bằng cảm tính.";
  }
  return "Nhấn mạnh trách nhiệm đơn của bước này và không trộn nó với layer khác.";
}

function proofForStep(step: ScenarioStepItem) {
  const haystack = [step.badge, step.layer, step.path, step.summary].join(" ").toLowerCase();
  if (/test/.test(haystack)) return `Automated test: mở ${step.path} và đọc Arrange-Act-Assert.`;
  if (/repository|datastore|serialization/.test(haystack)) return "Bằng chứng: repository test hoặc snapshot DataStore phản ánh đúng entity/state sau thao tác.";
  if (/service|lock|scheduler|bid|auth/.test(haystack)) return "Bằng chứng: service test, concurrency test hoặc demo nhiều client đi qua đúng business rule.";
  if (/socket|handler|router|protocol|message|request|response/.test(haystack)) return "Bằng chứng: request/response bám đúng Action và server đi vào đúng branch của ClientHandler.";
  if (/fxml|controller|ui|javafx/.test(haystack)) return "Bằng chứng: click UI tạo đúng request và notification/state hiển thị đúng.";
  if (/maven|pom|ci/.test(haystack)) return "Bằng chứng: `mvn clean install` hoặc workflow build pass.";
  return "Bằng chứng: mở line refs trong Code map và chạy manual case tương ứng.";
}

function Visualize({
  lockMode,
  setLockMode,
  setActivePage,
  scenarioId,
  setScenarioId,
  expandedScenarioStep,
  setExpandedScenarioStep,
}: {
  lockMode: "race" | "locked";
  setLockMode: (mode: "race" | "locked") => void;
  setActivePage: (page: PageKey) => void;
  scenarioId: string;
  setScenarioId: (id: string) => void;
  expandedScenarioStep: string;
  setExpandedScenarioStep: (id: string) => void;
}) {
  const selectedScenario = scenarioFlows.find((flow) => flow.id === scenarioId) ?? scenarioFlows[0];
  const [flowFilter, setFlowFilter] = useState<(typeof flowStepFilters)[number]>("All");
  const visualizeStats = useMemo(() => {
    const allSteps = scenarioFlows.flatMap((flow) => flow.steps);
    return {
      steps: allSteps.length,
      files: new Set(allSteps.map((step) => step.path)).size,
    };
  }, []);
  const scenarioGuide = useMemo(() => buildScenarioGuide(selectedScenario), [selectedScenario]);
  const filteredScenarioSteps = useMemo(() => {
    if (flowFilter === "All") return selectedScenario.steps;
    const needle = flowFilter.toLowerCase();
    return selectedScenario.steps.filter((step) => {
      const haystack = [step.badge, step.layer, step.role, step.path, step.title, step.summary].join(" ").toLowerCase();
      if (flowFilter === "Build") return /maven|pom|ci|workflow|build|command|properties|wrapper/.test(haystack);
      if (flowFilter === "UI") return /ui|fxml|controller|css|shell|scene|javafx/.test(haystack);
      return haystack.includes(needle);
    });
  }, [flowFilter, selectedScenario.steps]);

  return (
    <section className="page-stack">
      <SectionHeader
        eyebrow="Visual lab"
        title="Component visualize để nhìn cơ chế chạy"
        text="Các sơ đồ này biến phần dễ nói mơ hồ như socket, serialization, lock, scheduler và observer thành hình ảnh có thể chỉ tay giải thích."
      />

      <div className="panel scenario-panel">
        <div className="panel-title">
          <div>
            <h3>Scenario flow deck</h3>
            <span>Học theo từng flow: từ màn hình, class xử lý đến bằng chứng test.</span>
          </div>
        </div>
        <div className="segmented scenario-tabs" role="tablist" aria-label="Chọn scenario flow">
          {scenarioFlows.map((flow) => (
            <button
              key={flow.id}
              type="button"
              className={selectedScenario.id === flow.id ? "active" : ""}
              onClick={() => {
                setScenarioId(flow.id);
                setExpandedScenarioStep(flow.steps[0]?.id ?? "");
              }}
            >
              {flow.label}
            </button>
          ))}
        </div>
        <div className="interview-filter-bar flow-filter-bar" aria-label="Lọc layer trong scenario">
          {flowStepFilters.map((filter) => (
            <button
              key={filter}
              className={flowFilter === filter ? "active" : ""}
              type="button"
              onClick={() => setFlowFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="visual-coverage-grid" aria-label="Độ phủ visualize">
          <span><strong>{scenarioFlows.length}</strong> luồng</span>
          <span><strong>{visualizeStats.steps}</strong> bước</span>
          <span><strong>{visualizeStats.files}</strong> file neo</span>
          <span><strong>{generatedManualCases.length}</strong> manual UI case</span>
        </div>
        <div className="coverage-checklist">
          {[
            "Register/login theo contract chung",
            "Place bid, auto-bid, anti-sniping",
            "Seller create item -> auto-create auction",
            "Admin ban/unban/cancel auction",
            "Observer + server push realtime",
            "DataStore + repository persistence",
            "Maven multi-module + wrapper build",
            "FXML/controller -> NetworkClient -> ClientHandler",
          ].map((item) => (
            <span key={item}><CheckCircle2 size={14} aria-hidden />{item}</span>
          ))}
        </div>
        <div className="scenario-learning-grid" aria-label="Hướng dẫn học luồng đang chọn">
          <article className="scenario-brief-card">
            <span>Cách kể 90 giây</span>
            <p>{scenarioGuide.narrative}</p>
          </article>
          <article className="scenario-brief-card">
            <span>File cần mở theo thứ tự</span>
            <ol>
              {scenarioGuide.fileOrder.map((file) => (
                <li key={file}>{file}</li>
              ))}
            </ol>
          </article>
          <article className="scenario-brief-card risk-brief">
            <span>Invariant/rủi ro phải nói</span>
            <ul>
              {scenarioGuide.invariants.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
        <div className="scenario-heading">
          <h3>{selectedScenario.title}</h3>
          <p>{selectedScenario.subtitle}</p>
        </div>
        <div className="scenario-steps">
          {filteredScenarioSteps.map((step, index) => {
            const isOpen = expandedScenarioStep === step.id;
            const studyDetails = buildStepStudyDetails(step, selectedScenario, index);
            return (
              <article key={step.id} className={`scenario-step ${isOpen ? "open" : ""}`}>
                <button type="button" onClick={() => setExpandedScenarioStep(isOpen ? "" : step.id)}>
                  <span className="step-index">{step.order}</span>
                  <span className={`module-chip module-${step.module}`}>{step.badge}</span>
                  <strong>{step.title}</strong>
                  <small>{step.summary}</small>
                </button>
                {isOpen && (
                  <div className="scenario-detail">
                    <div className="flow-detail-grid">
                      <div className="example-box">
                        <strong>Vai trò/layer:</strong>
                        <span>{step.role ?? step.module} · {step.layer ?? step.badge}</span>
                      </div>
                      <div className="example-box">
                        <strong>Bước này chạy khi nào:</strong>
                        <span>{step.trigger ?? step.summary}</span>
                      </div>
                      <div className="example-box">
                        <strong>Input:</strong>
                        <span>{step.input ?? "Dữ liệu từ bước trước trong luồng hoặc thao tác hiện tại của người dùng/server."}</span>
                      </div>
                      <div className="example-box">
                        <strong>Output:</strong>
                        <span>{step.output ?? "State/response/event được chuyển sang bước kế tiếp."}</span>
                      </div>
                    </div>
                    <div className="example-box">
                      <strong>Ý nghĩa file:</strong>
                      <span>{step.meaning}</span>
                    </div>
                    <div className="example-box">
                      <strong>Vì sao dòng code này quan trọng:</strong>
                      <span>{step.whyItMatters ?? step.summary}</span>
                    </div>
                    <div className="step-study-card">
                      <span>Cách nói khi mở bước này</span>
                      <p>{studyDetails.script}</p>
                    </div>
                    <div className="step-study-columns">
                      <div>
                        <h4>Checklist trả lời</h4>
                        <ul>
                          {studyDetails.checklist.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4>Trace debug</h4>
                        <ul>
                          {studyDetails.debug.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4>Test/demo cần nhắc</h4>
                        <ul>
                          {studyDetails.demo.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <LineRefList
                      path={step.path}
                      refs={step.codeNotes.map((note) => ({
                        line: note.line,
                        code: `${step.path}: ${note.code}`,
                        explain: note.note,
                      }))}
                    />
                    <div className="flow-detail-grid">
                      <div className="example-box">
                        <strong>Bước kế tiếp:</strong>
                        <span>{step.nextLinks?.length ? step.nextLinks.join(" -> ") : "Đây là bước cuối của luồng hiện tại."}</span>
                      </div>
                      <div className="example-box failure-box">
                        <strong>Nếu lỗi thì sao:</strong>
                        <span>{step.failureMode ?? "Luồng dừng ở bước này; cần trace lại response/log và file đang được mở trong Code map."}</span>
                      </div>
                    </div>
                    <div className="step-viva-list">
                      <strong>Câu hỏi giảng viên có thể xoáy:</strong>
                      <ul>
                        {studyDetails.questions.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <button className="ghost-button" type="button" onClick={() => setActivePage("code")}>
                      Mở Code map và tìm path này
                    </button>
                    <div className="tag-cloud">
                      {step.links.map((link) => (
                        <code key={link}>{link}</code>
                      ))}
                    </div>
                  </div>
                )}
                {index < filteredScenarioSteps.length - 1 && <i aria-hidden />}
              </article>
            );
          })}
          {!filteredScenarioSteps.length && (
            <p className="hint">Không có bước nào khớp filter này trong luồng đang chọn.</p>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <h3>Swimlane PLACE_BID</h3>
          <button type="button" onClick={() => setActivePage("code")}>
            Xem file liên quan
          </button>
        </div>
        <div className="swimlane">
          {placeBidFlow.map((step) => {
            const Icon = iconByLane[step.lane];
            return (
              <article key={step.id} className={`flow-card lane-${step.lane.toLowerCase()}`}>
                <div>
                  <Icon size={18} aria-hidden />
                  <span>{step.lane}</span>
                </div>
                <h4>{step.title}</h4>
                <p>{step.detail}</p>
                <code>{step.file}</code>
              </article>
            );
          })}
        </div>
      </div>

      <div className="grid two">
        <div className="panel">
          <div className="panel-title">
            <h3>Concurrency timeline</h3>
            <div className="tiny-toggle" aria-label="Chọn chế độ lock">
              <button
                type="button"
                className={lockMode === "race" ? "active" : ""}
                onClick={() => setLockMode("race")}
              >
                Không lock
              </button>
              <button
                type="button"
                className={lockMode === "locked" ? "active" : ""}
                onClick={() => setLockMode("locked")}
              >
                Có lock
              </button>
            </div>
          </div>
          <ConcurrencyTimeline mode={lockMode} />
        </div>

        <div className="panel">
          <div className="panel-title">
            <h3>Auction state machine</h3>
            <span>lifecycle + scheduler</span>
          </div>
          <div className="state-machine">
            {lifecycleStates.map((state, index) => (
              <div key={state.name} className="state-node">
                <span>{state.name}</span>
                <p>{state.note}</p>
                {index < lifecycleStates.length - 1 && <i aria-hidden />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid two">
        <DatabaseDiagram />
        <SocketInspector />
      </div>

      <div className="grid two">
        <MavenGraph />
        <SchedulerReplay />
      </div>
    </section>
  );
}

function ConcurrencyTimeline({ mode }: { mode: "race" | "locked" }) {
  const rows =
    mode === "race"
      ? [
          ["T1", "Bidder A đọc current_price = 100", "pass"],
          ["T2", "Bidder B cũng đọc current_price = 100", "warn"],
          ["T3", "A update 120", "pass"],
          ["T4", "B update 110 ghi sau", "fail"],
          ["Kết quả", "Lost update: giá cuối có thể sai", "fail"],
        ]
      : [
          ["T1", "Bidder A lấy lock auction#42", "pass"],
          ["T2", "Bidder B đợi lock cùng auction", "warn"],
          ["T3", "A transaction commit giá 120", "pass"],
          ["T4", "B đọc lại current_price = 120", "pass"],
          ["Kết quả", "Không lost update, rule được kiểm trên dữ liệu mới", "pass"],
        ];

  return (
    <div className="timeline">
      {rows.map(([time, text, tone]) => (
        <div key={`${time}-${text}`} className={`timeline-row ${tone}`}>
          <span>{time}</span>
          <p>{text}</p>
        </div>
      ))}
    </div>
  );
}

function DatabaseDiagram() {
  return (
    <div className="panel">
      <div className="panel-title">
        <h3>Persistence map</h3>
        <span>DataStore + serialized snapshot</span>
      </div>
      <div className="erd-grid">
        {dbTables.map((table) => (
          <article key={table.name} className="table-card" style={{ borderTopColor: table.color }}>
            <h4>{table.name}</h4>
            {table.columns.map((column) => (
              <span key={column}>{column}</span>
            ))}
          </article>
        ))}
      </div>
      <p className="hint">
        Snapshot chính: users, items, auctions và bidTransactions được giữ trong RAM rồi save xuống `data/auction_data.dat`.
      </p>
    </div>
  );
}

function SocketInspector() {
  return (
    <div className="panel">
      <div className="panel-title">
        <h3>Socket message inspector</h3>
        <span>Java Serialization</span>
      </div>
      <div className="code-sample">
        <pre>{`Client -> Server
new ClientRequest(
  Action.PLACE_BID,
  new PlaceBidRequest(auctionId, bidderId, amount, false)
)

Server -> Client
new ClientResponse(
  true,
  "Đặt giá thành công",
  BidTransaction
)

Server Push
new ServerPushMessage(
  PushType.NEW_BID,
  "Current price changed",
  Auction
)`}</pre>
      </div>
    </div>
  );
}

function MavenGraph() {
  return (
    <div className="panel">
      <div className="panel-title">
        <h3>Maven dependency graph</h3>
        <span>parent reactor</span>
      </div>
      <div className="maven-graph">
        {mavenModules.map((module) => (
          <article key={module.name} className={module.name === "root build" ? "maven-node maven-root" : "maven-node"}>
            <Boxes size={18} aria-hidden />
            {module.name === "root build" && <span className="node-eyebrow">root pom + reactor</span>}
            <h4>{module.name}</h4>
            <p>{module.purpose}</p>
            <div className="tag-cloud">
              {module.deps.map((dep) => (
                <code key={dep}>{dep}</code>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function SchedulerReplay() {
  const data = [
    { tick: "00s", due: 0, closed: 0 },
    { tick: "10s", due: 2, closed: 1 },
    { tick: "20s", due: 3, closed: 3 },
    { tick: "retry", due: 1, closed: 1 },
  ];

  return (
    <div className="panel">
      <div className="panel-title">
        <h3>Scheduler replay</h3>
        <span>start / end / extend</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="tick" tick={{ fill: "var(--muted)" }} />
          <YAxis tick={{ fill: "var(--muted)" }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink)" }}
            labelStyle={{ color: "var(--ink)" }}
          />
          <Line type="monotone" dataKey="due" stroke="var(--amber)" strokeWidth={2} />
          <Line type="monotone" dataKey="closed" stroke="var(--green)" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
      <p className="hint">Ý cần nói: scheduler chạy server-side và anti-sniping reschedule end task khi bid tới sát giờ đóng.</p>
    </div>
  );
}

function CodeMap({
  files,
  query,
  setQuery,
}: {
  files: GeneratedCodeFile[];
  query: string;
  setQuery: (value: string) => void;
}) {
  const [moduleFilter, setModuleFilter] = useState("all");
  const [layerFilter, setLayerFilter] = useState("all");
  const [extensionFilter, setExtensionFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");

  const modules = useMemo(() => uniqueSorted(projectCodeFiles.map((file) => file.module)), []);
  const layers = useMemo(() => uniqueSorted(projectCodeFiles.map((file) => file.layer)), []);
  const extensions = useMemo(() => uniqueSorted(projectCodeFiles.map((file) => file.extension)), []);

  const visibleFiles = useMemo(
    () =>
      files.filter((file) => {
        if (moduleFilter !== "all" && file.module !== moduleFilter) return false;
        if (layerFilter !== "all" && file.layer !== layerFilter) return false;
        if (extensionFilter !== "all" && file.extension !== extensionFilter) return false;
        if (scopeFilter === "source" && !file.path.includes("/src/main/java/")) return false;
        if (scopeFilter === "ui" && !/(controller|resources\/view|resources\/css|client\/src\/main)/.test(file.path)) return false;
        if (scopeFilter === "tests" && !file.path.includes("/src/test/")) return false;
        if (scopeFilter === "docs" && !(/^(docs\/|README\.md$|DESIGN\.md$)/.test(file.path))) return false;
        if (scopeFilter === "build" && !/(pom\.xml|\.github|\.properties|mvnw|mvnw\.cmd)/.test(file.path)) return false;
        return true;
      }),
    [extensionFilter, files, layerFilter, moduleFilter, scopeFilter],
  );
  const hasActiveFilters =
    moduleFilter !== "all" || layerFilter !== "all" || extensionFilter !== "all" || scopeFilter !== "all" || query.trim();

  const layerCounts = visibleFiles.reduce<Record<string, number>>((acc, file) => {
    acc[file.layer] = (acc[file.layer] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="page-stack">
      <SectionHeader
        eyebrow="Code map"
        title="Toàn bộ code map sinh từ thư mục project"
        text={`Đang hiển thị ${visibleFiles.length}/${projectCodeFiles.length} file có nghĩa trong repo, gồm Java, FXML, CSS, Maven, docs, test và contract common. Mỗi file có line refs để mở đúng dòng khi vấn đáp.`}
      />
      <label className="wide-search">
        <Search size={18} aria-hidden />
        <span>Tìm trong code map</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ví dụ: BidService, serialization, AuctionScheduler" />
      </label>

      <div className="panel code-filter-panel">
        <div className="filter-row">
          <label>
            <span>Module</span>
            <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
              <option value="all">Tất cả module</option>
              {modules.map((module) => (
                <option key={module} value={module}>{module}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Layer</span>
            <select value={layerFilter} onChange={(event) => setLayerFilter(event.target.value)}>
              <option value="all">Tất cả layer</option>
              {layers.map((layer) => (
                <option key={layer} value={layer}>{layer}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Loại file</span>
            <select value={extensionFilter} onChange={(event) => setExtensionFilter(event.target.value)}>
              <option value="all">Tất cả extension</option>
              {extensions.map((extension) => (
                <option key={extension} value={extension}>{extension}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="scope-tabs" role="tablist" aria-label="Học theo từng phần code map">
          {[
            ["all", "Tất cả"],
            ["source", "Source Java"],
            ["ui", "Client UI"],
            ["tests", "Tests"],
            ["docs", "Docs"],
            ["build", "Build/Maven/CI"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={scopeFilter === value ? "active" : ""}
              onClick={() => setScopeFilter(value)}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className={hasActiveFilters ? "reset-visible" : ""}
            onClick={() => {
              setModuleFilter("all");
              setLayerFilter("all");
              setExtensionFilter("all");
              setScopeFilter("all");
              setQuery("");
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="coverage-pills" aria-label="Thống kê layer trong code map">
        {Object.entries(layerCounts).map(([layer, count]) => (
          <span key={layer}>
            <strong>{count}</strong> {layer}
          </span>
        ))}
      </div>

      <div className="file-grid">
        {visibleFiles.map((file) => {
          const guide = buildFileStudyGuide(file);
          const queryNeedle = query.trim().toLowerCase();
          const methodChips = [
            ...file.methods.map((item) => `L${item.line} ${item.name}()`),
            ...(file.fxml?.actions.map((item) => `L${item.line} #${item.action}`) ?? []),
          ];
          const prioritizedMethodChips = queryNeedle
            ? [
                ...methodChips.filter((item) => item.toLowerCase().includes(queryNeedle)),
                ...methodChips.filter((item) => !item.toLowerCase().includes(queryNeedle)),
              ]
            : methodChips;
          return (
            <article key={file.path} className="panel file-card">
              <div className="file-head">
                <span>{file.layer}</span>
                <strong>{file.lineCount} dòng</strong>
              </div>
              <h3>{file.path}</h3>
              <p>{file.summary}</p>
              <div className="file-study-guide">
                <div>
                  <strong>Vai trò file</strong>
                  <p>{guide.role}</p>
                </div>
                <div>
                  <strong>Khi vấn đáp cần nói</strong>
                  <p>{guide.viva}</p>
                </div>
                <div>
                  <strong>Rủi ro nếu sửa sai</strong>
                  <p>{guide.risk}</p>
                </div>
              </div>
              <ul className="file-study-checklist">
                {guide.checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {guide.related.length > 0 && (
                <div className="tag-cloud file-related">
                  {guide.related.map((item) => (
                    <code key={item}>{item}</code>
                  ))}
                </div>
              )}
              <h4>Line refs cần mở khi bị hỏi</h4>
              <LineRefList refs={file.importantLines.slice(0, 8)} path={file.path} />
              <div className="file-meta">
                <div>
                  <span>Declarations</span>
                  {file.declarations.slice(0, 4).map((item) => (
                    <code key={`${item.line}-${item.name}`}>L{item.line} {item.kind} {item.name}</code>
                  ))}
                </div>
                <div>
                  <span>Methods / actions</span>
                  {prioritizedMethodChips.slice(0, 8).map((item) => (
                    <code key={item}>{item}</code>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function buildFileStudyGuide(file: GeneratedCodeFile) {
  const pathParts = file.path.split("/");
  const base = pathParts[pathParts.length - 1] ?? file.path;
  const methods = file.methods.slice(0, 3).map((method) => `${method.name}()`);
  const actions = file.fxml?.actions.slice(0, 3).map((action) => `#${action.action}`) ?? [];
  const anchors = [...methods, ...actions];
  const related = Array.from(
    new Set(
      scenarioFlows
        .flatMap((flow) => flow.steps)
        .filter((step) => step.path === file.path || step.links.includes(file.path))
        .map((step) => step.title),
    ),
  ).slice(0, 5);

  if (base === "NetworkClient.java") {
    return {
      role: "Singleton network layer giữ socket, responseQueue và push listener cho toàn bộ JavaFX client.",
      viva: "Nói rõ vì sao cùng một ObjectInputStream phải tách ClientResponse và ServerPushMessage bằng listener thread.",
      risk: "Một lỗi ở đây có thể làm cả request/response lẫn realtime push hỏng cùng lúc.",
      checklist: ["Chỉ connect().", "Chỉ sendRequest/sendRequestAsync.", "Chỉ listenForServerMessages và responseQueue."],
      related,
    };
  }

  if (base === "ClientHandler.java") {
    return {
      role: "Socket boundary phía server: ép kiểu ClientRequest, switch theo Action và dispatch sang đúng service.",
      viva: "Khi mở file này, nói branch action nào sẽ đi tới UserService, ItemService, AuctionService, BidService hoặc AutoBidService.",
      risk: "Payload check sai hoặc dispatch nhầm branch sẽ làm cả flow đúng contract nhưng sai business behavior.",
      checklist: ["Chỉ switch(action).", "Chỉ payload type-check.", "Nối sang service kế tiếp."],
      related,
    };
  }

  if (file.layer === "JavaFX Controller") {
    return {
      role: `Controller nhận thao tác của màn ${base.replace("Controller.java", "")}, validate nhanh và tạo request hoặc điều hướng UI.`,
      viva: `Bắt đầu từ FXML onAction/fx:id, rồi nói các method chính ${anchors.join(", ") || "initialize/handler"} tạo Action nào hoặc load scene nào.`,
      risk: "UI có thể không phản hồi, gửi request sai payload hoặc cập nhật JavaFX state sai thread.",
      checklist: ["Nêu input người dùng.", "Nêu NetworkClient/FXMLLoader được gọi.", "Nêu response/event cập nhật view ra sao."],
      related,
    };
  }

  if (file.layer === "FXML View") {
    return {
      role: "View khai báo layout, control, fx:id và onAction để nối sang controller JavaFX.",
      viva: `Chỉ controller của FXML và các action ${anchors.join(", ") || "được khai báo trong view"}.`,
      risk: "Sai fx:id/onAction làm controller không nhận được control hoặc click không chạy.",
      checklist: ["Chỉ fx:controller.", "Chỉ button/control người dùng thao tác.", "Nối sang controller tương ứng."],
      related,
    };
  }

  if (file.layer.includes("Service")) {
    return {
      role: "Nơi xử lý rule nghiệp vụ, lock, scheduler, observer hoặc orchestration giữa repository/service khác.",
      viva: `Nói invariant file bảo vệ và method chính ${anchors.join(", ") || "được line refs liệt kê"}.`,
      risk: "Business rule bị phá: auth sai, bid sai, status auction sai hoặc event phát sai thời điểm.",
      checklist: ["Nêu input từ handler.", "Nêu repository/service được gọi.", "Nêu test bảo vệ behavior."],
      related,
    };
  }

  if (file.layer.includes("Repository") || file.layer.includes("Data Store")) {
    return {
      role: "Boundary persistence: đọc/ghi entity và snapshot DataStore thay vì để service chạm list/file trực tiếp.",
      viva: "Nói repository hoặc DataStore này bảo vệ danh sách nào và vì sao service không chạm persistence root trực tiếp.",
      risk: "State persistence sai, save/load snapshot lệch hoặc repository update không đồng bộ với business flow.",
      checklist: ["Nêu entity bị tác động.", "Nêu method save/find/update chính.", "Nêu repository/data store test tương ứng."],
      related,
    };
  }

  if (file.layer.includes("Socket") || file.layer.includes("Handler") || file.layer === "Message Contract") {
    return {
      role: "Boundary client-server: nhận/gửi Action, Request/Response hoặc event realtime.",
      viva: "Nói Action, payload Serializable và handler/service kế tiếp.",
      risk: "Client/server lệch contract, route nhầm quyền hoặc event không tới subscriber.",
      checklist: ["Nêu Action hoặc PushType.", "Nêu payload/request wrapper.", "Nêu branch/service kế tiếp."],
      related,
    };
  }

  if (file.layer === "Client Utility") {
    return {
      role: "Utility dùng chung phía JavaFX client để controller không lặp logic phụ trợ.",
      viva: `Nói file này phục vụ controller nào và method chính ${anchors.join(", ") || "trong line refs"}.`,
      risk: "Lỗi lan sang nhiều màn vì utility được dùng lại ở nhiều controller.",
      checklist: ["Nêu controller sử dụng.", "Nêu input/output của utility.", "Nêu case UI cần test lại."],
      related,
    };
  }

  return {
    role: `File thuộc layer ${file.layer}, dùng trong module ${file.module}.`,
    viva: "Dựa vào summary, declarations, methods/actions và line refs để nói trách nhiệm, ai gọi file này và output là gì.",
    risk: "Sửa sai có thể làm đứt flow liên quan hoặc khiến câu trả lời vấn đáp không nối được layer.",
    checklist: ["Nêu layer.", "Nêu method/action chính.", "Nêu file trước và file sau trong flow."],
    related,
  };
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function LineRefList({ refs, path }: { refs: { line: number; code: string; explain: string }[]; path?: string }) {
  if (!refs.length) {
    return <p className="hint">Generator chưa thấy line đặc biệt; mở file để đọc tuần tự từ dòng 1.</p>;
  }

  return (
    <div className="line-ref-list">
      {refs.map((ref) => (
        <div key={`${path}-${ref.line}-${ref.code}`} className="line-ref">
          <span>L{ref.line}</span>
          <code>{ref.code}</code>
          <p>{ref.explain}</p>
        </div>
      ))}
    </div>
  );
}

function FormattedAnswer({ text }: { text: string }) {
  const blocks = text
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="formatted-answer">
      {blocks.map((block, index) => {
        const lines = block
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        const allBullets = lines.length > 1 && lines.every((line) => /^[-*]\s+/.test(line));

        if (allBullets) {
          return (
            <ul key={`${index}-${lines[0]}`}>
              {lines.map((line) => (
                <li key={line}>{line.replace(/^[-*]\s+/, "")}</li>
              ))}
            </ul>
          );
        }

        return <p key={`${index}-${block.slice(0, 32)}`}>{lines.join(" ")}</p>;
      })}
    </div>
  );
}

function Theory({ topics }: { topics: typeof theoryTopics }) {
  const grouped = topics.reduce<Record<string, typeof theoryTopics>>((acc, topic) => {
    acc[topic.category] ??= [];
    acc[topic.category].push(topic);
    return acc;
  }, {});

  return (
    <section className="page-stack">
      <SectionHeader
        eyebrow="Theory library"
        title="Lý thuyết gắn trực tiếp vào repo"
        text={`Không học khái niệm rời rạc. Mỗi thẻ cho biết định nghĩa, ví dụ trong ${projectLabel}, file cần mở và link đọc thêm.`}
      />
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="theory-group">
          <h3>{category}</h3>
          <div className="theory-grid">
            {items.map((topic) => (
              <article key={topic.id} className="panel theory-card">
                <div className="file-head">
                  <span>{topic.level}</span>
                  <strong className={statusClass[topic.status]}>{statusLabel[topic.status]}</strong>
                </div>
                {topic.category === "Design Principles & Patterns" && (
                  <span className="principle-badge">Pattern / SOLID / Principle</span>
                )}
                <h4>{topic.title}</h4>
                <p>{topic.summary}</p>
                <div className="example-box">
                  <strong>Trong project:</strong>
                  <span>{topic.projectExample}</span>
                </div>
                <div className="tag-cloud">
                  {topic.files.map((file) => (
                    <code key={file}>{file}</code>
                  ))}
                </div>
                <div className="learn-links">
                  {topic.links.map((link) => (
                    <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function Tests({
  checked,
  toggleProgress,
}: {
  checked: Record<string, boolean>;
  toggleProgress: (id: string) => void;
}) {
  return (
    <section className="page-stack">
      <SectionHeader
        eyebrow="Test lab"
        title="Đọc test như đọc kịch bản bảo vệ"
        text="Mỗi test được chia Arrange, Act, Assert và câu hỏi vấn đáp tương ứng để thành viên biết chạy gì, chứng minh gì."
      />

      <div className="grid two">
        {testCases.map((test) => (
          <article key={test.name} className="panel test-card">
            <div className="panel-title">
              <h3>{test.name}</h3>
              <label className="mini-check">
                <input
                  type="checkbox"
                  checked={Boolean(checked[test.name])}
                  onChange={() => toggleProgress(test.name)}
                />
                Đã giải thích được
              </label>
            </div>
            <p>{test.target}</p>
            <code className="command">{test.command}</code>
            <div className="aaa">
              <p><strong>Arrange:</strong> {test.arrange}</p>
              <p><strong>Act:</strong> {test.act}</p>
              <p><strong>Assert:</strong> {test.assert}</p>
            </div>
            <div className="example-box">
              <strong>Câu hỏi vấn đáp:</strong>
              <span>{test.viva}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="panel">
        <div className="panel-title">
          <h3>Manual UI cases sinh từ FXML/controller</h3>
          <span>{generatedManualCases.length} case: thao tác, kỳ vọng, dòng code chạy</span>
        </div>
        <div className="manual-grid generated-manual-grid">
          {generatedManualCases.map((script) => (
            <article key={script.id}>
              <div className="file-head">
                <span>{script.role}</span>
                <strong>{script.executionPath.length} refs</strong>
              </div>
              <h4>{script.title}</h4>
              <ol>
                {script.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p><strong>Kết quả đúng:</strong> {script.expected}</p>
              <LineRefList
                path={script.title}
                refs={script.executionPath.map((ref) => ({
                  line: ref.line,
                  code: `${"path" in ref && ref.path ? `${ref.path}: ` : ""}${ref.code}`,
                  explain: ref.explain,
                }))}
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Interview({
  question,
  questionId,
  setQuestionId,
  showAnswer,
  setShowAnswer,
  questions,
}: {
  question: CuratedInterviewQuestion;
  questionId: string;
  setQuestionId: (id: string) => void;
  showAnswer: boolean;
  setShowAnswer: (value: boolean) => void;
  questions: CuratedInterviewQuestion[];
}) {
  const [bankQuery, setBankQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<(typeof interviewFilters)[number]>("All");
  const deferredBankQuery = useDeferredValue(bankQuery.trim().toLowerCase());
  const filteredQuestions = useMemo(() => {
    return questions.filter((item) => {
      const filterMatch =
        activeFilter === "All" ||
        item.tags.some((tag) => tag.toLowerCase().includes(activeFilter.toLowerCase())) ||
        item.topic.toLowerCase().includes(activeFilter.toLowerCase()) ||
        item.level.toLowerCase().includes(activeFilter.toLowerCase());
      if (!filterMatch) return false;
      if (!deferredBankQuery) return true;
      return [
        item.question,
        item.answer,
        item.intent,
        item.topic,
        item.level,
        item.filePath,
        ...item.answerBullets,
        ...item.mustMention,
        ...item.commonMistakes,
        ...item.tags,
        ...item.lineRefs.map((ref) => `${ref.code} ${ref.explain}`),
      ]
        .join(" ")
        .toLowerCase()
        .includes(deferredBankQuery);
    });
  }, [activeFilter, deferredBankQuery, questions]);
  const visibleQuestionButtons = useMemo(() => {
    return filteredQuestions;
  }, [filteredQuestions]);
  const activeFilteredIndex = useMemo(
    () => filteredQuestions.findIndex((item) => item.id === questionId),
    [filteredQuestions, questionId],
  );
  const activeFilteredPosition = activeFilteredIndex >= 0 ? activeFilteredIndex + 1 : 0;

  useEffect(() => {
    if (!filteredQuestions.length) return;
    if (filteredQuestions.some((item) => item.id === question.id)) return;
    setQuestionId(filteredQuestions[0].id);
    setShowAnswer(false);
  }, [filteredQuestions, question.id, setQuestionId, setShowAnswer]);

  function nextQuestion(delta: number) {
    if (!filteredQuestions.length) return;
    const currentIndex = filteredQuestions.findIndex((item) => item.id === questionId);
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const next = (baseIndex + delta + filteredQuestions.length) % filteredQuestions.length;
    setQuestionId(filteredQuestions[next]?.id ?? filteredQuestions[0].id);
    setShowAnswer(false);
  }

  return (
    <section className="page-stack">
      <SectionHeader
        eyebrow="Mock viva"
        title={`Ngân hàng ${questions.length} câu vấn đáp LLM-curated có line code`}
        text="Câu hỏi và đáp án được viết lại theo kiểu học vấn đáp: nói luồng, mở file thật, giải thích tradeoff, nêu lỗi dễ sai và test/demo cần chứng minh."
      />

      <div className="interview-layout">
        <div className="panel question-panel">
          <div className="file-head">
            <span>{question.level}</span>
            <strong>{question.topic}</strong>
          </div>
          <div className="tag-row question-tags">
            {Array.from(new Set(question.tags)).slice(0, 6).map((tag, index) => (
              <span key={`${tag}-${index}`}>{tag}</span>
            ))}
          </div>
          <h2>{question.question}</h2>
          <div className="rubric-card intent-card">
            <div>
              <Sparkles size={18} aria-hidden />
              <strong>Mục tiêu câu hỏi</strong>
            </div>
            <p>{question.intent}</p>
          </div>
          <div className="example-box">
            <strong>File chính:</strong>
            <span>{question.filePath || "Flow tổng hợp nhiều file"}</span>
          </div>
          <LineRefList refs={question.lineRefs} path={question.filePath} />
          <div className="rubric-grid">
            <div className="rubric-card">
              <div>
                <ShieldCheck size={18} aria-hidden />
                <strong>Ý bắt buộc</strong>
              </div>
              <ul>
                {question.mustMention.slice(0, 5).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rubric-card">
              <div>
                <TimerReset size={18} aria-hidden />
                <strong>Follow-up nhanh</strong>
              </div>
              <ul>
                {question.followUps.slice(0, 3).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="quick-actions">
            <button className="primary-button" type="button" onClick={() => setShowAnswer(!showAnswer)}>
              <BookOpen size={18} aria-hidden />
              {showAnswer ? "Ẩn đáp án" : "Mở đáp án"}
            </button>
            <button className="ghost-button" type="button" onClick={() => nextQuestion(1)}>
              Câu tiếp
            </button>
            <button className="ghost-button" type="button" onClick={() => nextQuestion(-1)}>
              Câu trước
            </button>
          </div>
          {showAnswer && (
            <div className="answer-box">
              <h3>Đáp án mẫu</h3>
              <FormattedAnswer text={question.answer} />
              <div className="answer-rubric">
                <div>
                  <h4>Cách trả lời đạt điểm</h4>
                  <ul>
                    {question.answerBullets.map((item) => (
                      <li key={item}>
                        <CheckCircle2 size={16} aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4>Sai lầm cần tránh</h4>
                  <ul>
                    {question.commonMistakes.map((item) => (
                      <li key={item}>
                        <TimerReset size={16} aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-title">
            <h3>Follow-up</h3>
            <span>{activeFilteredPosition}/{filteredQuestions.length || questions.length}</span>
          </div>
          <ul className="clean-list">
            {question.followUps.map((item) => (
              <li key={item}>
                <TimerReset size={16} aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <label className="question-filter">
            <Search size={16} aria-hidden />
            <span className="sr-only">Tìm câu hỏi vấn đáp</span>
            <input
              value={bankQuery}
              onChange={(event) => setBankQuery(event.target.value)}
              placeholder="Lọc câu theo file/topic/line code..."
            />
          </label>
          <div className="interview-filter-bar" aria-label="Lọc nhóm câu hỏi vấn đáp">
            {interviewFilters.map((filter) => (
              <button
                key={filter}
                className={filter === activeFilter ? "active" : ""}
                type="button"
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="question-jump">
            {visibleQuestionButtons.map((item, index) => (
              <button
                key={item.id}
                className={item.id === questionId ? "active" : ""}
                type="button"
                onClick={() => {
                  setQuestionId(item.id);
                  setShowAnswer(false);
                }}
                aria-label={`Mở câu hỏi ${index + 1} trong tập đã lọc`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <p className="hint question-hint">
            Đang hiện {visibleQuestionButtons.length} câu trong tập đã lọc
            {activeFilter === "All" && !deferredBankQuery ? ` trên tổng ${questions.length} câu.` : `. Tổng ngân hàng hiện có ${questions.length} câu.`}
          </p>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="section-header">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}
