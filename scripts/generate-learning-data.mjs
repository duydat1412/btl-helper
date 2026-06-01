import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const cliArgs = parseArgs(process.argv.slice(2));
const repoRoot = path.resolve(cliArgs["repo-root"] ?? process.env.LEARNING_REPO_ROOT ?? "D:\\BTL");
const projectLabel = cliArgs["project-label"] ?? process.env.LEARNING_PROJECT_LABEL ?? "BTL";
const outFile = path.resolve("src/generatedProjectData.ts");

const excludedDirs = new Set([
  ".git",
  ".agents",
  ".claude",
  ".codex",
  ".gemini",
  ".worktrees",
  ".venv",
  ".idea",
  ".vscode",
  ".next",
  "node_modules",
  "target",
  "dist",
  "build",
  "out",
  "data",
]);

const includedExtensions = new Set([
  ".java",
  ".fxml",
  ".css",
  ".xml",
  ".properties",
  ".md",
  ".json",
  ".yml",
  ".yaml",
  ".cmd",
  ".sh",
]);

const includedBasenames = new Set([
  "pom.xml",
  "mvnw",
  "mvnw.cmd",
  "README.md",
  "DESIGN.md",
]);

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = args[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = "true";
    }
  }
  return parsed;
}

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    if (excludedDirs.has(entry.name)) return [];
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (includedBasenames.has(entry.name) || includedExtensions.has(ext)) {
      return [fullPath];
    }
    return [];
  });
}

function walkAll(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    if (excludedDirs.has(entry.name)) return [];
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walkAll(fullPath);
    }
    return [fullPath];
  });
}

function rel(fullPath) {
  return path.relative(repoRoot, fullPath).replaceAll(path.sep, "/");
}

function moduleFor(relativePath) {
  if (relativePath.startsWith("auction-client/")) return "auction-client";
  if (relativePath.startsWith("auction-common/")) return "auction-common";
  if (relativePath.startsWith("auction-server/")) return "auction-server";
  if (relativePath.startsWith("docs/")) return "docs";
  if (relativePath.startsWith(".github/")) return ".github";
  return "root";
}

function layerFor(relativePath) {
  if (relativePath === "pom.xml" || relativePath.endsWith("/pom.xml") || relativePath === "mvnw" || relativePath === "mvnw.cmd") {
    return "Maven";
  }
  if (relativePath.startsWith(".github/")) return "CI";
  if (relativePath.startsWith("docs/") || /(^|\/)(README|DESIGN)\.md$/i.test(relativePath)) return "Documentation";
  if (relativePath.includes("/src/test/java/")) return "Test";
  if (relativePath.includes("/src/main/resources/view/")) return "FXML View";
  if (relativePath.includes("/src/main/resources/css/")) return "CSS";
  if (relativePath.includes("/controller/")) return "JavaFX Controller";
  if (relativePath.includes("/network/")) return "Network Client";
  if (relativePath.includes("/util/")) return "Client Utility";
  if (relativePath.includes("/message/")) return "Message Contract";
  if (relativePath.includes("/entity/")) return "Common Entity";
  if (relativePath.includes("/enums/")) return "Enum";
  if (relativePath.includes("/factory/")) return "Factory";
  if (relativePath.includes("/strategy/")) return "Strategy";
  if (relativePath.includes("/observer/")) return relativePath.startsWith("auction-server/") ? "Server Observer" : "Observer Contract";
  if (relativePath.includes("/handler/")) return "Socket Handler";
  if (relativePath.includes("/service/")) return "Server Service";
  if (relativePath.includes("/repository/")) return "Repository";
  if (relativePath.includes("/datastore/")) return "Data Store";
  if (relativePath.includes("/exception/")) return "Exception";
  if (relativePath.includes("/resources/")) return "Resource";
  return "Project File";
}

function summaryFor(relativePath, layer, lines) {
  const base = path.basename(relativePath);
  const name = base.replace(/\.[^.]+$/, "");
  if (base === "Action.java") return "Enum liệt kê toàn bộ lệnh socket mà client được phép gửi và ClientHandler phải hiểu.";
  if (base === "ClientRequest.java") return "Wrapper request chuẩn hoá Action + payload Serializable để client gửi sang server qua socket.";
  if (base === "ClientResponse.java") return "Wrapper response chuẩn hoá success/message/data để mọi action trả về cùng một contract.";
  if (base === "ServerPushMessage.java") return "Contract realtime để server broadcast NEW_BID, PRICE_UPDATE, AUCTION_STARTED hoặc AUCTION_ENDED tới client.";
  if (base === "NetworkClient.java") return "Singleton socket client giữ kết nối, tách request/response khỏi server push bằng listener thread và queue.";
  if (base === "ClientHandler.java") return "Boundary server đọc ClientRequest, switch theo Action và dispatch sang đúng service/repository flow.";
  if (base === "BidService.java") return "Service đặt giá có per-auction lock, strategy injection và anti-sniping extension ngay trước lúc kết phiên.";
  if (base === "AuctionScheduler.java") return "Scheduler server-side tự mở/đóng phiên, hỗ trợ anti-sniping bằng cách dời endTime và reschedule task.";
  if (base === "AutoBidService.java") return "Observer phản ứng với bid mới để kích hoạt AutoBidStrategy và dọn config khi phiên kết thúc hoặc bị hủy.";
  if (base === "AuctionEventManager.java") return "Publisher trung tâm cho observer flow: bid mới, đổi trạng thái và kết thúc phiên.";
  if (base === "BroadcastObserver.java") return "Observer bridge giữa event manager và ClientRegistry để mọi client nhận được cập nhật realtime.";
  if (base === "DataStore.java") return "Singleton in-memory store lưu users/items/auctions/bidTransactions và persist bằng Java Serialization xuống auction_data.dat.";
  if (base === "UserService.java") return "Service auth xử lý đăng ký, đăng nhập, BCrypt hash/check và quyền admin cho ban/unban.";
  if (base === "ItemService.java") return "Service CRUD item, dùng ItemFactory để tạo đúng subclass và tự tạo + lên lịch auction khi seller tạo item.";
  if (base === "AuctionService.java") return "Service tạo, truy vấn và hủy auction; kiểm soát seller/admin flow và nối sang scheduler/event manager.";
  if (layer === "JavaFX Controller") return `Controller JavaFX cho màn ${name.replace("Controller", "")}: nhận event UI, tạo request hoặc điều hướng theo ClientResponse.`;
  if (layer === "FXML View") return `FXML định nghĩa layout, fx:id và onAction cho màn ${name.replace(/[_-]/g, " ")}.`;
  if (layer === "Message Contract") return `Contract dùng chung giữa client và server trong module common; đổi field ở đây sẽ làm cả hai phía phải cập nhật theo.`;
  if (layer === "Common Entity") return `Entity/domain object dùng chung cho client, server, repository và serialization snapshot.`;
  if (layer === "Strategy") return `Strategy pattern cho bidding logic hoặc policy biến thiên mà không sửa service gọi bên ngoài.`;
  if (layer === "Factory") return `Factory tạo object domain đúng subclass để controller/service không phải new thủ công theo từng loại item.`;
  if (layer === "Socket Handler") return "Điểm vào socket phía server: parse object, validate payload và định tuyến action.";
  if (layer === "Server Service") return "Service phía server chứa business rule, concurrency rule, scheduling hoặc authorization rule.";
  if (layer === "Repository") return "Repository boundary truy cập DataStore và cô lập service khỏi chi tiết persistence cụ thể.";
  if (layer === "Data Store") return "Persistence root quản lý snapshot dữ liệu runtime và default bootstrap state.";
  if (layer === "Network Client") return "Client-side network layer kết nối tới localhost:8080 và chuyển object qua ObjectOutputStream/ObjectInputStream.";
  if (layer === "Server Observer") return "Observer server nhận auction events rồi broadcast hoặc kích hoạt luồng phụ như auto-bid.";
  if (layer === "Test") return `JUnit test chứng minh behavior của ${name} trong các case dễ bị hỏi lúc vấn đáp hoặc demo.`;
  if (layer === "Maven") return "Maven reactor/build entry mô tả module, dependency và cách chạy build hoặc exec plugin.";
  if (layer === "Documentation") return "Tài liệu giúp giải thích kiến trúc, contract hoặc cách chạy dự án khi demo và vấn đáp.";
  const joined = lines.slice(0, 40).join(" ").toLowerCase();
  if (joined.includes("serialization")) return "File liên quan tới serialization flow của hệ thống đấu giá client-server.";
  return `File ${base} thuộc layer ${layer} trong repo ${projectLabel}.`;
}

function lineExplain(code, layer) {
  const trimmed = code.trim();
  if (!trimmed) return "Dòng trống hoặc chỉ để tách khối logic.";
  if (trimmed.startsWith("package ")) return "Xác định module/package thật của file, rất hữu ích khi giảng viên hỏi class này nằm ở phía nào.";
  if (trimmed.startsWith("import ")) return "Cho thấy file đang phụ thuộc contract, entity hay hạ tầng nào.";
  const typeMatch = trimmed.match(/(?:class|interface|enum|record)\s+([A-Za-z_][A-Za-z0-9_]*)/);
  if (typeMatch) {
    return `Khai báo ${typeMatch[1]} - đây là điểm mở đầu tốt nhất để nói trách nhiệm chính của file trong layer ${layer}.`;
  }
  if (/Action\./.test(trimmed)) return "Điểm neo cho request routing hoặc action contract giữa client và server.";
  if (/ClientRequest|ClientResponse|ServerPushMessage/.test(trimmed)) return "Dòng này chạm trực tiếp vào contract object đi qua socket.";
  if (/ObjectOutputStream|ObjectInputStream|Socket/.test(trimmed)) return "Cho thấy dự án đang giao tiếp raw TCP socket bằng Java Serialization, không phải REST/JSON.";
  if (/BCrypt/.test(trimmed)) return "Chứng minh password được hash/check ở server thay vì tin vào client.";
  if (/ReentrantLock|ConcurrentHashMap|computeIfAbsent|lock\(|unlock\(/.test(trimmed)) return "Đây là chỗ bảo vệ race condition khi nhiều client bid cùng một auction.";
  if (/ScheduledExecutorService|scheduleAuction|schedule\(|extendAuctionEnd/.test(trimmed)) return "Liên quan scheduler hoặc anti-sniping - phần dễ bị hỏi khi nói về lifecycle auction.";
  if (/notifyNewBid|notifyAuctionEnded|notifyStatusChanged|broadcast/.test(trimmed)) return "Observer/realtime line: state đổi xong rồi mới phát push ra toàn bộ client.";
  if (/ItemFactory|createItem\(/.test(trimmed)) return "Thể hiện pattern hoặc điểm khởi tạo object domain thay vì hard-code subclass ở UI.";
  if (/thenAccept|CompletableFuture|Platform\.runLater/.test(trimmed)) return "Async UI-handling line: network chạy nền nhưng update JavaFX phải quay lại UI thread.";
  if (/fx:controller|onAction|@FXML/.test(trimmed)) return "Neo giữa FXML và controller method thật chạy khi user click hoặc load màn hình.";
  if (/saveData|loadData|auction_data\.dat|FileOutputStream|FileInputStream/.test(trimmed)) return "Chỉ ra persistence snapshot của hệ thống nằm ở DataStore và file .dat.";
  if (layer === "Test") return "Dòng test dùng làm bằng chứng hành vi; đọc theo Arrange-Act-Assert sẽ dễ hơn chỉ đọc tên method.";
  if (layer === "Maven" || layer === "CI") return "Dòng build/CI này cho biết project được ghép module và chạy verify như thế nào.";
  return "Dòng quan trọng để neo câu trả lời vào code thật thay vì mô tả chung chung.";
}

function parseJava(lines) {
  const declarations = [];
  const methods = [];
  const importantLines = [];

  const methodPattern = /^\s*(?:public|private|protected)\s+(?:static\s+)?(?:final\s+)?(?:synchronized\s+)?(?:<[^>]+>\s*)?[\w[\]<>?,.\s]+\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([^;]*\)\s*(?:throws [^{]+)?\{?\s*$/;
  const constructorPattern = /^\s*(?:public|private|protected)\s+([A-Z][A-Za-z0-9_]*)\s*\([^;]*\)\s*(?:throws [^{]+)?\{?\s*$/;
  const declarationPattern = /\b(class|interface|enum|record)\s+([A-Za-z_][A-Za-z0-9_]*)/;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNo = index + 1;
    const trimmed = line.trim();
    if (!trimmed) continue;

    const declarationMatch = trimmed.match(declarationPattern);
    if (declarationMatch && !trimmed.startsWith("//")) {
      declarations.push({
        line: lineNo,
        kind: declarationMatch[1],
        name: declarationMatch[2],
        code: trimmed,
      });
    }

    const constructorMatch = trimmed.match(constructorPattern);
    if (constructorMatch && !trimmed.startsWith("//")) {
      methods.push({
        line: lineNo,
        name: constructorMatch[1],
        code: trimmed,
      });
      continue;
    }

    const methodMatch = trimmed.match(methodPattern);
    if (methodMatch && !trimmed.startsWith("//")) {
      methods.push({
        line: lineNo,
        name: methodMatch[1],
        code: trimmed,
      });
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("//")) continue;
    if (
      trimmed.startsWith("package ") ||
      trimmed.startsWith("public class ") ||
      trimmed.startsWith("public interface ") ||
      trimmed.startsWith("public enum ") ||
      trimmed.startsWith("public record ") ||
      trimmed.startsWith("@FXML") ||
      trimmed.includes("ObjectOutputStream") ||
      trimmed.includes("ObjectInputStream") ||
      trimmed.includes("ClientRequest") ||
      trimmed.includes("ClientResponse") ||
      trimmed.includes("ServerPushMessage") ||
      trimmed.includes("switch (action)") ||
      trimmed.startsWith("case ") ||
      trimmed.includes("Action.") ||
      trimmed.includes("BCrypt") ||
      trimmed.includes("ReentrantLock") ||
      trimmed.includes("computeIfAbsent") ||
      trimmed.includes("scheduleAuction") ||
      trimmed.includes("notifyNewBid") ||
      trimmed.includes("notifyAuctionEnded") ||
      trimmed.includes("notifyStatusChanged") ||
      trimmed.includes("saveData") ||
      trimmed.includes("loadData") ||
      trimmed.includes("auction_data.dat") ||
      trimmed.includes("Platform.runLater") ||
      trimmed.includes("thenAccept") ||
      trimmed.includes("CompletableFuture")
    ) {
      importantLines.push({
        line: index + 1,
        code: trimmed,
      });
    }
  }

  return { declarations, methods, importantLines };
}

function parseFXML(lines) {
  let controller = null;
  let controllerLine = null;
  const actions = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!controller) {
      const controllerMatch = line.match(/fx:controller="([^"]+)"/);
      if (controllerMatch) {
        controller = controllerMatch[1];
        controllerLine = index + 1;
      }
    }
    const actionMatches = [...line.matchAll(/onAction="#([^"]+)"/g)];
    for (const match of actionMatches) {
      actions.push({
        action: match[1],
        line: index + 1,
        code: line.trim(),
      });
    }
  }

  const importantLines = [];
  if (controller && controllerLine) {
    importantLines.push({
      line: controllerLine,
      code: `fx:controller="${controller}"`,
    });
  }
  for (const action of actions.slice(0, 8)) {
    importantLines.push({
      line: action.line,
      code: action.code,
    });
  }

  return {
    controller,
    controllerLine,
    actions,
    importantLines,
  };
}

function toControllerPath(controllerName) {
  if (!controllerName) return null;
  const relativeJava = `${controllerName.replaceAll(".", "/")}.java`;
  if (relativeJava.includes("/client/")) {
    return `auction-client/src/main/java/${relativeJava}`;
  }
  if (relativeJava.includes("/server/")) {
    return `auction-server/src/main/java/${relativeJava}`;
  }
  if (relativeJava.includes("/common/")) {
    return `auction-common/src/main/java/${relativeJava}`;
  }
  return null;
}

function findLineRefs(file, patterns, fallbackCount = 3) {
  if (!file) return [];
  const pool = file.importantLines.length ? file.importantLines : file.methods.map((method) => ({
    line: method.line,
    code: method.code,
    explain: `Method ${method.name} là điểm vào thực thi của file.`,
  }));
  if (!pool.length) return [];

  const normalizedPatterns = patterns.map((pattern) => pattern.toLowerCase());
  const exact = pool.filter((entry) => normalizedPatterns.some((pattern) => `${entry.code} ${entry.explain}`.toLowerCase().includes(pattern)));
  const selected = exact.length ? exact : pool.slice(0, fallbackCount);
  return selected.slice(0, fallbackCount).map((entry) => ({
    line: entry.line,
    code: entry.code,
    explain: entry.explain,
  }));
}

function unique(values) {
  return [...new Set(values)];
}

function buildManualCases(codeFiles) {
  const fileMap = new Map(codeFiles.map((file) => [file.path, file]));
  const fxmlFiles = codeFiles.filter((file) => file.layer === "FXML View");
  const cases = [];

  for (const file of fxmlFiles) {
    const screen = path.basename(file.path, path.extname(file.path));
    const role = roleForScreen(screen);
    const controllerPath = toControllerPath(file.fxml?.controller ?? null);
    const controllerFile = controllerPath ? fileMap.get(controllerPath) : null;

    for (const action of file.fxml?.actions ?? []) {
      const controllerMethod = controllerFile?.methods.find((method) => method.name === action.action);
      const actionPath = controllerPath ?? file.path;
      const steps = manualStepsFor(screen, action.action);
      const expected = manualExpectedFor(screen, action.action);
      const executionPath = [
        {
          path: file.path,
          line: action.line,
          code: action.code,
          explain: "UI action trong FXML kích hoạt controller method khi người dùng bấm nút.",
        },
      ];

      if (controllerFile && controllerMethod) {
        executionPath.push({
          path: controllerFile.path,
          line: controllerMethod.line,
          code: controllerMethod.code,
          explain: "Controller method thật xử lý event hoặc điều hướng flow.",
        });
      }

      const actionRefs = controllerFile
        ? findLineRefs(controllerFile, [action.action, "Action.", "ClientRequest", "ClientResponse", "FXMLLoader", "Platform.runLater"], 3)
        : [];
      for (const ref of actionRefs) {
        executionPath.push({
          path: actionPath,
          line: ref.line,
          code: ref.code,
          explain: ref.explain,
        });
      }

      cases.push({
        id: `${screen}-${action.action}`.toLowerCase(),
        title: manualTitleFor(screen, action.action),
        screen,
        role,
        steps,
        expected,
        executionPath: dedupeLineRefs(executionPath),
      });
    }
  }

  return cases.sort((a, b) => a.id.localeCompare(b.id));
}

function roleForScreen(screen) {
  if (screen.includes("admin")) return "Admin";
  if (screen.includes("seller") || screen.includes("create_item")) return "Seller";
  if (screen.includes("auction")) return "Bidder";
  return "Guest";
}

function manualTitleFor(screen, action) {
  const screenName = screen.replaceAll("_", " ");
  const map = {
    handleLogin: "Login flow async + route theo role",
    handleRegister: "Register flow tạo ClientRequest(Action.REGISTER)",
    handlePlaceBid: "Place bid gửi socket request và cập nhật realtime",
    handleCreateItem: "Seller tạo item và lên lịch auction",
    handleChooseImage: "Seller chọn ảnh cho item trước khi gửi request",
    handleLogout: "Điều hướng logout về màn login",
    handleRefresh: "Refresh UI hoặc reload danh sách",
    goBack: "Điều hướng quay lại màn trước",
  };
  return `${screenName}: ${map[action] ?? action}`;
}

function manualStepsFor(screen, action) {
  if (action === "handleLogin") {
    return [
      "Mở login screen, nhập username/password hợp lệ.",
      "Bấm Login và quan sát label chuyển sang trạng thái đang xử lý.",
      "Xác nhận client gửi request async, nhận ClientResponse rồi route theo role BIDDER/SELLER/ADMIN.",
    ];
  }
  if (action === "handleRegister") {
    return [
      "Mở register screen, nhập username/password/email và chọn role BIDDER hoặc SELLER.",
      "Bấm Register và quan sát status label đổi màu theo success hoặc error.",
      "Kiểm tra server trả message đúng khi duplicate username hoặc role không hợp lệ.",
    ];
  }
  if (action === "handlePlaceBid") {
    return [
      "Mở auction detail của một phiên đang RUNNING.",
      "Nhập số tiền bid rồi bấm Place Bid.",
      "Quan sát current price/time label đổi theo ClientResponse hoặc push realtime.",
    ];
  }
  if (action === "handleCreateItem") {
    return [
      "Đăng nhập seller và mở màn create item.",
      "Nhập tên, giá, loại, thời lượng; tùy chọn chọn ảnh rồi bấm tạo.",
      "Xác nhận item được tạo và server tự lên lịch start/end cho auction liên kết.",
    ];
  }
  if (action === "handleChooseImage") {
    return [
      "Mở create item screen.",
      "Bấm nút chọn ảnh và chọn một file hợp lệ.",
      "Quan sát đường dẫn được đổ vào text field trước khi gửi CreateItemRequest.",
    ];
  }
  if (action === "handleLogout") {
    return [
      `Mở màn ${screen.replaceAll("_", " ")} sau khi đã đăng nhập.`,
      "Bấm Logout.",
      "Xác nhận scene chuyển về login.fxml mà không gọi business flow server.",
    ];
  }
  if (action === "goBack") {
    return [
      `Mở màn ${screen.replaceAll("_", " ")}.`,
      "Bấm nút Back hoặc Cancel.",
      "Xác nhận FXMLLoader nạp lại scene trước đó thay vì giữ state màn hiện tại.",
    ];
  }
  if (action === "handleRefresh") {
    return [
      `Mở màn ${screen.replaceAll("_", " ")}.`,
      "Bấm Refresh.",
      "Kiểm tra UI thông báo reload hoặc thực hiện lại flow lấy dữ liệu.",
    ];
  }
  return [
    `Mở màn ${screen.replaceAll("_", " ")}.`,
    `Kích hoạt action ${action}.`,
    "Quan sát status/scene thay đổi và đối chiếu với line refs tương ứng trong controller.",
  ];
}

function manualExpectedFor(screen, action) {
  if (action === "handleLogin") {
    return "Login success phải set currentUser rồi route sang auction_list/seller_dashboard/admin; login fail phải giữ nguyên màn và hiện message.";
  }
  if (action === "handleRegister") {
    return "Client phải tạo ClientRequest(Action.REGISTER), server validate trên UserService và trả ClientResponse với message rõ ràng.";
  }
  if (action === "handlePlaceBid") {
    return "Bid hợp lệ phải cập nhật giá hiện tại; bid lỗi phải trả message từ server; push NEW_BID/AUCTION_ENDED phải phản ánh đúng trên UI.";
  }
  if (action === "handleCreateItem") {
    return "Create item success phải sinh item và auction tương ứng, đồng thời scheduler được lên lịch theo durationMinutes.";
  }
  if (action === "handleChooseImage") {
    return "Đường dẫn file được giữ ở UI để chèn vào extraAttributes khi tạo item; không có server call ở bước này.";
  }
  if (action === "handleLogout" || action === "goBack") {
    return "FXMLLoader phải chuyển đúng scene mục tiêu; flow này chủ yếu là UI navigation chứ không thay đổi business state.";
  }
  return `Action ${action} trên màn ${screen} phải phản hồi đúng với trạng thái UI và line code tương ứng.`;
}

function dedupeLineRefs(refs) {
  const seen = new Set();
  return refs.filter((ref) => {
    const key = `${ref.path ?? ""}:${ref.line}:${ref.code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildQuestionBank(codeFiles) {
  const fileMap = new Map(codeFiles.map((file) => [file.path, file]));
  const questions = [];
  const questionSpecs = [
    {
      id: "action-contract",
      level: "Cơ bản",
      topic: "Action enum và contract request",
      tags: ["Flow", "Design", "Line code"],
      filePath: "auction-common/src/main/java/com/auction/common/message/Action.java",
      patterns: ["enum Action", "REGISTER", "PLACE_BID", "REMOVE_AUTO_BID"],
      question: "Vì sao `Action.java` là file phải mở đầu tiên khi giải thích client-server flow của dự án này?",
      intent: "Buộc người học nói đúng contract socket: request không tự route theo tên class mà theo Action.",
      answer: "Action là bảng lệnh chung giữa client và server. ClientRequest chỉ mang hai thứ: Action và payload Serializable. Ở phía server, ClientHandler đọc request rồi switch theo Action để chọn đúng handler/service. Vì vậy khi giải thích bất kỳ luồng nào như REGISTER, LOGIN hay PLACE_BID, mở Action trước sẽ cho thấy hệ thống hỗ trợ lệnh nào thật sự có trong source, tránh kể thêm flow không tồn tại trong nhánh hiện tại.",
      answerBullets: [
        "Nói Action là source of truth cho command list đi qua socket.",
        "Nối sang ClientRequest và ClientHandler switch(action).",
        "Chỉ rõ mọi flow đều phải map về một Action cụ thể.",
      ],
      mustMention: ["Action", "ClientRequest", "ClientHandler", "switch(action)"],
      commonMistakes: [
        "Nhầm Action với endpoint REST hoặc JSON route.",
        "Kể feature không có enum tương ứng trong source hiện tại.",
      ],
      followUps: [
        "Nếu thêm action mới mà quên update ClientHandler thì chuyện gì xảy ra?",
        "Action nào liên quan tới auto-bid trong source hiện tại?",
      ],
    },
    {
      id: "request-response-wrapper",
      level: "Cơ bản",
      topic: "ClientRequest / ClientResponse wrapper",
      tags: ["Flow", "Design", "Line code"],
      filePath: "auction-common/src/main/java/com/auction/common/message/ClientRequest.java",
      patterns: ["private final Action action", "private final Serializable payload", "ClientResponse"],
      question: "Giải thích vì sao dự án dùng `ClientRequest` và `ClientResponse` thay vì để từng controller gửi object tuỳ ý qua socket.",
      intent: "Kiểm tra người học hiểu contract thống nhất và lợi ích của wrapper khi debug cũng như mở rộng action.",
      answer: "Wrapper tạo ra một contract ổn định cho toàn hệ thống. Mọi request đều có Action + payload nên server có thể route chung ở ClientHandler. Mọi response đều có success, message và data nên client xử lý UI thống nhất mà không phải đoán kiểu object đọc từ stream. Điều này đặc biệt quan trọng với raw socket + serialization vì hai phía phải thống nhất 100% về class và field.",
      answerBullets: [
        "Nói rõ Action + payload ở request, success/message/data ở response.",
        "Giải thích raw socket cần contract cứng hơn vì không có HTTP layer hỗ trợ.",
        "Nêu lợi ích khi debug và mở rộng action mới.",
      ],
      mustMention: ["Serializable", "Action", "success/message/data", "ClientHandler"],
      commonMistakes: [
        "Nói wrapper chỉ để đẹp code.",
        "Quên lý do hai phía phải đồng bộ class khi dùng serialization.",
      ],
      followUps: [
        "Nếu payload không Serializable thì lỗi sẽ xảy ra ở đâu?",
        "Vì sao docs nhấn mạnh không tạo duplicate request class ở client/server?",
      ],
    },
    {
      id: "network-client-socket",
      level: "Trung bình",
      topic: "NetworkClient và listener thread",
      tags: ["Flow", "Design", "Debug", "Line code"],
      filePath: "auction-client/src/main/java/com/auction/client/network/NetworkClient.java",
      patterns: ["Socket(HOST, PORT)", "BlockingQueue<ClientResponse>", "listenForServerMessages", "pushListeners"],
      question: "Trong `NetworkClient`, vì sao phải tách `ClientResponse` và `ServerPushMessage` bằng listener thread + queue?",
      intent: "Kiểm tra hiểu biết về request/response song song với realtime push trên cùng một socket.",
      answer: "Một kết nối socket đang phải phục vụ hai loại dữ liệu: response cho request đang chờ và push message do server chủ động gửi. Listener thread đọc object liên tục từ ObjectInputStream, nếu là ClientResponse thì đẩy vào responseQueue cho sendRequest lấy ra; nếu là ServerPushMessage thì dispatch tới push listeners. Cách tách này giữ được flow đồng bộ cho request nhưng vẫn không bỏ lỡ realtime update như NEW_BID hay AUCTION_ENDED.",
      answerBullets: [
        "Nêu một socket phục vụ cả response và server push.",
        "Giải thích responseQueue dùng cho sendRequest blocking.",
        "Giải thích pushListeners dùng cho realtime UI update.",
      ],
      mustMention: ["ObjectInputStream", "responseQueue", "listenForServerMessages", "PushListener"],
      commonMistakes: [
        "Nói sendRequest tự đọc trực tiếp từ stream mà quên listener thread.",
        "Không phân biệt ClientResponse với ServerPushMessage.",
      ],
      followUps: [
        "Nếu listener thread dừng thì bid realtime sẽ hỏng biểu hiện như thế nào?",
        "Vì sao update UI phải quay lại Platform.runLater ở controller?",
      ],
    },
    {
      id: "login-controller",
      level: "Cơ bản",
      topic: "Login flow từ JavaFX tới server",
      tags: ["Flow", "Debug", "Line code"],
      filePath: "auction-client/src/main/java/com/auction/client/controller/LoginController.java",
      patterns: ["handleLogin", "client.loginAsync", "AuthUserData", "FXMLLoader.load"],
      question: "Kể ngắn gọn luồng Login từ `login.fxml` tới lúc client chuyển màn theo role.",
      intent: "Buộc người học nối được UI event, request async, response auth và điều hướng màn hình.",
      answer: "User nhập username/password trên login.fxml rồi bấm nút gắn với handleLogin. Controller kiểm tra rỗng, gọi NetworkClient.connect và loginAsync. Khi ClientResponse success quay về, controller ép kiểu data thành AuthUserData, lưu vào NetworkClient và chọn FXML theo role BIDDER/SELLER/ADMIN. Nếu fail thì chỉ cập nhật errorLabel, không tự kết luận ở client.",
      answerBullets: [
        "Bắt đầu từ FXML onAction -> LoginController.handleLogin.",
        "Nói request gửi async qua NetworkClient.loginAsync.",
        "Kết thúc bằng AuthUserData + route theo role.",
      ],
      mustMention: ["handleLogin", "loginAsync", "AuthUserData", "FXMLLoader"],
      commonMistakes: [
        "Nói client tự xác thực thành công mà quên server check password.",
        "Quên bước setCurrentUser trước khi chuyển màn.",
      ],
      followUps: [
        "Nếu login success nhưng route sai role thì mở file nào trước?",
        "Server đang hash/check password ở đâu?",
      ],
    },
    {
      id: "register-policy",
      level: "Trung bình",
      topic: "Register flow và policy role",
      tags: ["Flow", "Design", "Debug", "Test"],
      filePath: "auction-client/src/main/java/com/auction/client/controller/RegisterController.java",
      patterns: ["roleBox.setItems", "Action.REGISTER", "RegisterRequest"],
      question: "Luồng tự đăng ký đang bảo vệ việc không cho người dùng tự tạo ADMIN ở những lớp nào?",
      intent: "Kiểm tra hiểu cả UI constraint lẫn contract/policy source of truth, đồng thời thấy được nguy cơ mismatch với server.",
      answer: "Ở client, RegisterController chỉ đưa BIDDER và SELLER vào ComboBox nên UX mặc định không cho chọn ADMIN. Ở docs/contract, RegistrationPolicy mô tả self-registration chỉ cho BIDDER/SELLER. Tuy nhiên câu trả lời tốt phải nói thêm rằng server mới là nơi phải bảo vệ cuối cùng; nếu chỉ chặn ở UI mà UserService vẫn cho ADMIN khi payload được gửi thủ công thì đó là rủi ro contract drift cần nêu ra khi review.",
      answerBullets: [
        "Nêu client roleBox chỉ hiển thị BIDDER/SELLER.",
        "Nêu docs/RegistrationPolicy là source of truth mong muốn.",
        "Chỉ ra server mới là boundary phải chặn cuối cùng.",
      ],
      mustMention: ["RegisterController", "RegisterRequest", "RegistrationPolicy", "UserService.signup"],
      commonMistakes: [
        "Tin rằng chặn ở ComboBox là đủ an toàn.",
        "Không phát hiện drift giữa UI/docs và nhánh server hiện tại.",
      ],
      followUps: [
        "Test nào nên viết để bắt lỗi tự đăng ký ADMIN?",
        "Nếu payload forged từ client khác gửi lên thì sao?",
      ],
    },
    {
      id: "client-handler-dispatch",
      level: "Trung bình",
      topic: "ClientHandler dispatch",
      tags: ["Flow", "Design", "Debug", "Line code"],
      filePath: "auction-server/src/main/java/com/auction/server/handler/ClientHandler.java",
      patterns: ["handleIncomingRequest", "switch (action)", "case PLACE_BID", "failure("],
      question: "Vai trò thật của `ClientHandler` trong kiến trúc là gì, và vì sao không nên nhét business rule vào đây?",
      intent: "Xác nhận người học phân biệt boundary dispatch với service business rule.",
      answer: "ClientHandler là socket boundary của server. Nó đọc object từ stream, ép kiểu về ClientRequest, kiểm tra action/payload rồi route sang service tương ứng bằng switch(action). Nó có thể trả lỗi format hoặc payload sai kiểu, nhưng không nên mang hết business rule vào đây vì BidService, UserService hay ItemService mới là nơi giữ invariant của domain. Tách như vậy giúp test rõ hơn và tránh logic bị trộn với I/O socket.",
      answerBullets: [
        "Mô tả readObject -> ClientRequest -> switch(action).",
        "Phân biệt lỗi contract/payload với business rule.",
        "Nối handler tới UserService/ItemService/BidService.",
      ],
      mustMention: ["ClientRequest", "switch(action)", "payload validation", "service dispatch"],
      commonMistakes: [
        "Gọi ClientHandler là business layer chính.",
        "Không nói tới payload type-check trước khi service chạy.",
      ],
      followUps: [
        "Nếu payload PLACE_BID sai kiểu thì lỗi được trả ở đâu?",
        "Vì sao handleRegister gọi executeAuthAction thay vì new response trực tiếp trong mọi nhánh?",
      ],
    },
    {
      id: "user-service-auth",
      level: "Trung bình",
      topic: "BCrypt và auth server-side",
      tags: ["Flow", "Design", "Debug", "Test"],
      filePath: "auction-server/src/main/java/com/auction/server/service/UserService.java",
      patterns: ["BCrypt.hashpw", "BCrypt.checkpw", "findByUsername", "isBanned"],
      question: "Khi bị hỏi bảo mật đăng nhập, em phải chỉ ra điều gì trong `UserService.java`?",
      intent: "Buộc người học dùng source thật để chứng minh password không được tin ở client.",
      answer: "Điểm cần chỉ ra là server mới hash và check password bằng BCrypt. Trong signup, password plain text từ RegisterRequest được hash trước khi lưu User mới. Trong login, repository tìm user theo username rồi BCrypt.checkpw để xác thực; sau đó còn kiểm tra user có bị banned hay không. Như vậy client chỉ gửi raw credential qua socket, còn server là nơi quyết định auth có thành công hay không.",
      answerBullets: [
        "Chỉ rõ BCrypt.hashpw ở signup và BCrypt.checkpw ở login.",
        "Nói thêm banned check sau khi xác thực.",
        "Nhấn mạnh client không tự quyết định auth result.",
      ],
      mustMention: ["BCrypt", "signup", "login", "SerializableUserRepository"],
      commonMistakes: [
        "Nói password được mã hóa ở client.",
        "Quên banned user vẫn có thể bị chặn sau khi check password.",
      ],
      followUps: [
        "Default admin account được seed ở đâu?",
        "Nếu username trùng thì exception/message sinh ra ở lớp nào?",
      ],
    },
    {
      id: "item-factory-service",
      level: "Trung bình",
      topic: "ItemFactory + ItemService",
      tags: ["Pattern", "Design", "Flow", "Line code"],
      filePath: "auction-server/src/main/java/com/auction/server/service/ItemService.java",
      patterns: ["ItemFactory.createItem", "scheduleAuctionStart", "scheduleAuctionEndAt", "CreateItemRequest"],
      question: "Tại sao `ItemService.C()` vừa thể hiện Factory Pattern vừa nối thẳng sang auction lifecycle?",
      intent: "Kiểm tra khả năng nói design pattern nhưng vẫn bám flow thật của source.",
      answer: "Ở bước tạo item, service không new cứng Electronics/Art/Vehicle mà gọi ItemFactory.createItem theo ItemType, nhờ đó phần chọn subclass được tách khỏi controller. Sau khi item được lưu, service còn tự tạo Auction tương ứng, set start/end time và gọi AuctionScheduler để lên lịch start/end. Vì vậy đây không chỉ là CRUD item mà là điểm khởi tạo luôn một mini lifecycle cho auction gắn với item.",
      answerBullets: [
        "Nêu ItemFactory chọn subclass theo ItemType.",
        "Nêu service tự tạo Auction sau khi save item.",
        "Nêu scheduler được gọi ngay trong flow create item.",
      ],
      mustMention: ["ItemFactory", "CreateItemRequest", "AuctionScheduler", "SerializableItemRepository"],
      commonMistakes: [
        "Nói create item và create auction là hai flow hoàn toàn tách rời trong source hiện tại.",
        "Quên extraAttributes có durationMinutes/imagePath.",
      ],
      followUps: [
        "Nếu durationMinutes không parse được thì source đang làm gì?",
        "Auction mới tạo bắt đầu ở trạng thái nào trước scheduler chạy?",
      ],
    },
    {
      id: "place-bid-locking",
      level: "Nâng cao",
      topic: "BidService concurrency",
      tags: ["Flow", "Design", "Debug", "Test", "Line code"],
      filePath: "auction-server/src/main/java/com/auction/server/service/BidService.java",
      patterns: ["computeIfAbsent", "lock.lock()", "AuctionScheduler.extendAuctionEnd", "eventManager.notifyNewBid"],
      question: "Giải thích vì sao `BidService.placeBid()` là file quan trọng nhất khi nói về race condition trong dự án.",
      intent: "Buộc người học mô tả fine-grained locking, validate state, anti-sniping và observer notification đúng thứ tự.",
      answer: "BidService giữ một ReentrantLock riêng cho từng auction trong ConcurrentHashMap. Khi placeBid, service lấy lock theo auctionId để nhiều thread có thể bid song song trên các auction khác nhau nhưng không đè nhau trên cùng một auction. Bên trong critical section, nó kiểm tra auction còn RUNNING, dùng BidStrategy để tạo BidTransaction hợp lệ, cập nhật currentPrice/highestBidder, lưu bid và update auction. Nếu bid tới trong anti-sniping window thì scheduler sẽ extend endTime trước khi eventManager notifyNewBid phát realtime cho client.",
      answerBullets: [
        "Nói fine-grained lock theo auctionId, không phải lock toàn hệ thống.",
        "Nói thứ tự validate -> create bid -> save/update -> anti-sniping -> notify observer.",
        "Liên hệ trực tiếp với BidServiceConcurrencyTest.",
      ],
      mustMention: ["ReentrantLock", "ConcurrentHashMap", "AuctionScheduler.extendAuctionEnd", "notifyNewBid"],
      commonMistakes: [
        "Nói lock ở repository hoặc DataStore thay vì BidService.",
        "Quên unlock ở finally là bắt buộc để tránh deadlock.",
      ],
      followUps: [
        "Nếu bỏ lock thì lost update thể hiện ra sao trên currentPrice?",
        "AutoBidService được kích hoạt ở bước nào sau một bid thành công?",
      ],
    },
    {
      id: "scheduler-lifecycle",
      level: "Nâng cao",
      topic: "AuctionScheduler và lifecycle",
      tags: ["Flow", "Design", "Debug", "Test"],
      filePath: "auction-server/src/main/java/com/auction/server/service/AuctionScheduler.java",
      patterns: ["ScheduledExecutorService", "scheduleAuctionStart", "scheduleAuctionEndAt", "extendAuctionEnd"],
      question: "AuctionScheduler đang giải quyết những trạng thái nào của auction và anti-sniping được cài ở đâu?",
      intent: "Kiểm tra hiểu biết về lifecycle OPEN -> RUNNING -> FINISHED cùng reschedule khi có bid cuối phiên.",
      answer: "AuctionScheduler giữ các ScheduledFuture để quản lý start/end task theo auctionId. Nó có thể start ngay nếu thời gian đã tới, hoặc schedule start/end theo delay. Khi BidService phát hiện bid đến trong 30 giây cuối, nó gọi extendAuctionEnd để hủy task cũ, cộng thêm endTime và reschedule task mới. Khi start hoặc finish thành công, scheduler cập nhật AuctionStatus và thông báo cho event manager để broadcast push ra client.",
      answerBullets: [
        "Nêu OPEN/RUNNING/FINISHED là lifecycle chính scheduler tác động.",
        "Nêu anti-sniping nằm ở BidService gọi sang extendAuctionEnd của scheduler.",
        "Nêu scheduler không chỉ đổi status mà còn phát event qua event manager.",
      ],
      mustMention: ["ScheduledExecutorService", "extendAuctionEnd", "AuctionStatus", "notifyAuctionEnded"],
      commonMistakes: [
        "Nói anti-sniping do client tự tính.",
        "Quên scheduler cần cancel task cũ trước khi reschedule.",
      ],
      followUps: [
        "Nếu endTime đã qua khi schedule thì source xử lý thế nào?",
        "Test nào phù hợp để chứng minh scheduler đổi trạng thái đúng?",
      ],
    },
    {
      id: "observer-realtime",
      level: "Nâng cao",
      topic: "Observer và realtime push",
      tags: ["Pattern", "Design", "Flow", "Debug"],
      filePath: "auction-server/src/main/java/com/auction/server/observer/BroadcastObserver.java",
      patterns: ["ServerPushMessage", "ClientRegistry.getInstance().broadcast", "onNewBid", "onAuctionEnded"],
      question: "Dự án đang dùng Observer pattern như thế nào để đẩy realtime bid update lên client?",
      intent: "Buộc người học tách publisher, observer và channel broadcast thay vì nói mơ hồ 'server push'.",
      answer: "AuctionEventManager là publisher. BroadcastObserver là một observer subscribe vào manager để khi có bid mới hoặc đổi trạng thái, nó tạo ServerPushMessage rồi dùng ClientRegistry broadcast ra mọi client đang kết nối. AutoBidService cũng là observer khác trên cùng event stream, nhưng thay vì broadcast thì nó tự đặt giá. Mấu chốt là business state được cập nhật xong rồi mới phát event, nên client chỉ phản ánh trạng thái đã hợp lệ.",
      answerBullets: [
        "Nêu AuctionEventManager publish, BroadcastObserver subscribe.",
        "Nêu ServerPushMessage là contract đi ra client.",
        "Nêu AutoBidService cũng là observer khác trên cùng event stream.",
      ],
      mustMention: ["AuctionEventManager", "BroadcastObserver", "ServerPushMessage", "ClientRegistry"],
      commonMistakes: [
        "Gọi ClientRegistry là observer chính.",
        "Không phân biệt observer broadcast với observer auto-bid.",
      ],
      followUps: [
        "AuctionDetailController bắt push này ở đâu?",
        "Vì sao notify phải chạy sau khi repository update xong?",
      ],
    },
    {
      id: "auction-detail-push",
      level: "Trung bình",
      topic: "AuctionDetailController và realtime UI",
      tags: ["Flow", "Debug", "Line code"],
      filePath: "auction-client/src/main/java/com/auction/client/controller/AuctionDetailController.java",
      patterns: ["registerPushListener", "PushType.NEW_BID", "PushType.AUCTION_ENDED", "Platform.runLater"],
      question: "Ở client, `AuctionDetailController` nhận và phản ứng với push message như thế nào?",
      intent: "Kiểm tra hiểu luồng cuối cùng của realtime: từ server push về tới việc đổi label/disable input trên JavaFX thread.",
      answer: "Controller đăng ký một PushListener với NetworkClient khi setData được gọi. Listener phân loại ServerPushMessage: nếu là NEW_BID và đúng auction đang xem thì cập nhật currentPrice và timeLabel; nếu là AUCTION_ENDED thì đổi thông báo và disable bidAmountField. Toàn bộ update UI chạy trong Platform.runLater để không vi phạm JavaFX thread rule. Khi rời màn, controller phải remove listener để tránh memory leak hoặc cập nhật sai màn đã đóng.",
      answerBullets: [
        "Nêu registerPushListener lúc setData.",
        "Nêu lọc đúng currentAuction trước khi update UI.",
        "Nêu remove listener khi goBack.",
      ],
      mustMention: ["PushListener", "ServerPushMessage", "Platform.runLater", "removePushListener"],
      commonMistakes: [
        "Update UI trực tiếp từ thread mạng.",
        "Quên unregister listener khi chuyển màn.",
      ],
      followUps: [
        "Nếu push của auction khác đến thì source đang làm gì?",
        "Place bid thành công từ chính user này có đi qua push không, hay chỉ qua ClientResponse?",
      ],
    },
    {
      id: "datastore-serialization",
      level: "Trung bình",
      topic: "DataStore và Java Serialization",
      tags: ["Design", "Flow", "Debug", "Test"],
      filePath: "auction-server/src/main/java/com/auction/server/datastore/DataStore.java",
      patterns: ["FILE_PATH", "loadData", "saveData", "ensureDefaultAdminAccount"],
      question: "Vì sao `DataStore` là điểm phải mở khi bị hỏi hệ thống lưu dữ liệu ở đâu và restart server có mất dữ liệu không?",
      intent: "Buộc người học chỉ ra snapshot file `.dat`, in-memory singleton và bootstrap admin mặc định.",
      answer: "DataStore là singleton giữ bốn danh sách chính: users, items, auctions và bidTransactions. Khi server load, nó đọc snapshot từ `data/auction_data.dat`; khi save, nó serialise toàn bộ DataStore xuống file này. Nếu file chưa tồn tại, store tạo thư mục data và seed admin mặc định. Vì vậy dữ liệu runtime không nằm ở SQL hay REST backend khác mà nằm trong in-memory lists có cơ chế save/load bằng serialization.",
      answerBullets: [
        "Nêu file `data/auction_data.dat` là nơi snapshot được ghi.",
        "Nêu DataStore là singleton trong RAM rồi persist xuống file.",
        "Nêu ensureDefaultAdminAccount bootstrap admin mặc định.",
      ],
      mustMention: ["DataStore", "auction_data.dat", "loadData", "saveData"],
      commonMistakes: [
        "Nói dự án đang dùng database SQL.",
        "Quên admin mặc định được tạo ở DataStore nếu chưa có.",
      ],
      followUps: [
        "Repository nào đang đọc/ghi qua DataStore?",
        "Nếu file data hỏng thì startup sẽ biểu hiện thế nào?",
      ],
    },
    {
      id: "maven-multimodule",
      level: "Cơ bản",
      topic: "Maven multi-module",
      tags: ["Design", "Build", "Test"],
      filePath: "pom.xml",
      patterns: ["<modules>", "auction-common", "auction-server", "auction-client"],
      question: "Maven multi-module của dự án giúp gì cho việc tách `auction-common`, `auction-server`, `auction-client`?",
      intent: "Kiểm tra hiểu cấu trúc build và lý do common module tồn tại.",
      answer: "Parent POM ở root ghép ba module chính bằng reactor. `auction-common` chứa entity/message/enum/pattern dùng chung để client và server cùng compile với một source of truth. `auction-server` và `auction-client` phụ thuộc vào common nhưng mỗi bên vẫn giữ trách nhiệm riêng. Nhờ multi-module, lệnh build ở root có thể compile/test đồng bộ, giảm nguy cơ contract lệch giữa hai phía.",
      answerBullets: [
        "Nêu parent POM + reactor modules.",
        "Nêu common là source of truth cho shared contract/domain.",
        "Nêu build ở root giúp bắt sai lệch compile giữa các module.",
      ],
      mustMention: ["pom.xml", "auction-common", "auction-server", "auction-client"],
      commonMistakes: [
        "Coi common chỉ là thư mục tiện tay copy class.",
        "Không liên hệ multi-module với việc giữ contract đồng bộ.",
      ],
      followUps: [
        "Nếu sửa field trong common message thì module nào sẽ fail compile trước?",
        "Lệnh Maven nào repo README khuyến nghị để build toàn dự án?",
      ],
    },
    {
      id: "tests-proof",
      level: "Trung bình",
      topic: "Test như bằng chứng bảo vệ flow",
      tags: ["Test", "Debug", "Design"],
      filePath: "auction-server/src/test/java/com/auction/server/service/BidServiceConcurrencyTest.java",
      patterns: ["@Test", "BidServiceConcurrencyTest", "placeBid"],
      question: "Vì sao `BidServiceConcurrencyTest` là bằng chứng tốt hơn demo miệng khi nói race condition đã được xử lý?",
      intent: "Đẩy người học về mindset dùng test làm bằng chứng thay vì chỉ mô tả logic lock.",
      answer: "Demo tay chỉ cho thấy một lần chạy thuận lợi, còn concurrency bug dễ ẩn trong timing. BidServiceConcurrencyTest tạo tình huống nhiều luồng bid vào cùng auction để chứng minh lock theo auctionId và validate currentPrice hoạt động đúng. Khi vấn đáp, tốt nhất là nói logic trong BidService trước rồi chỉ test này như bằng chứng rằng lost update hoặc invalid interleaving đã được kiểm soát bằng code thực thi được.",
      answerBullets: [
        "Nói test tái hiện race condition có kiểm soát tốt hơn demo cảm tính.",
        "Liên hệ trực tiếp với lock theo auctionId trong BidService.",
        "Dùng test để chứng minh behavior chứ không chỉ nêu ý tưởng.",
      ],
      mustMention: ["BidServiceConcurrencyTest", "BidService", "lock theo auctionId"],
      commonMistakes: [
        "Đọc tên test mà không nói Arrange-Act-Assert.",
        "Không nối test về invariant cụ thể mà nó bảo vệ.",
      ],
      followUps: [
        "Ngoài concurrency test, test nào chứng minh auto-bid hoặc scheduler hoạt động?",
        "Nếu test fail ngắt quãng theo timing thì sẽ debug từ đâu?",
      ],
    },
    {
      id: "e2e-proof",
      level: "Trung bình",
      topic: "AuctionE2ETest",
      tags: ["Test", "Flow", "Debug"],
      filePath: "auction-server/src/test/java/com/auction/server/e2e/AuctionE2ETest.java",
      patterns: ["@Test", "AuctionE2ETest", "ClientHandler"],
      question: "Khi muốn chứng minh flow lớn của hệ thống không chỉ đúng ở từng service đơn lẻ, em sẽ viện dẫn `AuctionE2ETest` như thế nào?",
      intent: "Khuyến khích dùng end-to-end test như bằng chứng luồng liên module/server-contract.",
      answer: "E2E test có giá trị vì nó đi qua nhiều lớp hơn unit test: request contract, handler dispatch, service và repository/datastore. Khi nói về một flow lớn như login, create item hay place bid, em có thể dùng AuctionE2ETest để chứng minh các lớp đã nối với nhau đúng cách thay vì chỉ đúng từng method cục bộ. Quan trọng là đọc test theo luồng đầu vào, hành động và trạng thái đầu ra mà test xác nhận.",
      answerBullets: [
        "Nêu E2E test chứng minh integration chứ không chỉ unit behavior.",
        "Đọc theo flow vào -> handler/service -> output/assert.",
        "Dùng nó như bằng chứng sau khi đã giải thích code chính.",
      ],
      mustMention: ["AuctionE2ETest", "integration", "request/handler/service"],
      commonMistakes: [
        "Nhầm E2E với UI manual test.",
        "Không chỉ ra lớp nào được test nối với nhau.",
      ],
      followUps: [
        "Nếu E2E pass nhưng UI vẫn lỗi thì thường lỗi ở lớp nào?",
        "Test này khác gì manual case sinh từ FXML?",
      ],
    },
  ];

  for (const spec of questionSpecs) {
    const file = fileMap.get(spec.filePath);
    questions.push({
      id: spec.id,
      level: spec.level,
      topic: spec.topic,
      question: spec.question,
      answer: spec.answer,
      intent: spec.intent,
      answerBullets: spec.answerBullets,
      mustMention: spec.mustMention,
      commonMistakes: spec.commonMistakes,
      tags: spec.tags,
      filePath: spec.filePath,
      lineRefs: findLineRefs(file, spec.patterns, 4),
      followUps: spec.followUps,
    });
  }

  const genericSeeds = [
    { path: "auction-common/src/main/java/com/auction/common/message/ServerPushMessage.java", topic: "ServerPushMessage và push contract", tags: ["Flow", "Design", "Line code"] },
    { path: "auction-common/src/main/java/com/auction/common/strategy/AutoBidStrategy.java", topic: "AutoBidStrategy", tags: ["Pattern", "Design", "Line code"] },
    { path: "auction-common/src/main/java/com/auction/common/strategy/ManualBidStrategy.java", topic: "ManualBidStrategy", tags: ["Pattern", "Design", "Line code"] },
    { path: "auction-common/src/main/java/com/auction/common/factory/ItemFactory.java", topic: "ItemFactory", tags: ["Pattern", "Design", "Line code"] },
    { path: "auction-server/src/main/java/com/auction/server/observer/AuctionEventManager.java", topic: "AuctionEventManager", tags: ["Pattern", "Design", "Line code"] },
    { path: "auction-server/src/main/java/com/auction/server/repository/SerializableAuctionRepository.java", topic: "SerializableAuctionRepository", tags: ["Design", "Line code", "Debug"] },
    { path: "auction-server/src/main/java/com/auction/server/repository/SerializableBidRepository.java", topic: "SerializableBidRepository", tags: ["Design", "Line code", "Debug"] },
    { path: "auction-server/src/main/java/com/auction/server/repository/SerializableUserRepository.java", topic: "SerializableUserRepository", tags: ["Design", "Line code", "Debug"] },
    { path: "auction-client/src/main/java/com/auction/client/controller/CreateItemController.java", topic: "CreateItemController", tags: ["Flow", "Debug", "Line code"] },
    { path: "auction-client/src/main/java/com/auction/client/controller/AuctionDetailController.java", topic: "AuctionDetailController", tags: ["Flow", "Debug", "Line code"] },
    { path: "auction-client/src/main/java/com/auction/client/controller/AuctionListController.java", topic: "AuctionListController", tags: ["Flow", "Debug", "Line code"] },
    { path: "auction-client/src/main/resources/view/login.fxml", topic: "login.fxml", tags: ["Line code", "Flow"] },
    { path: "auction-client/src/main/resources/view/register.fxml", topic: "register.fxml", tags: ["Line code", "Flow"] },
    { path: "auction-client/src/main/resources/view/auction_detail.fxml", topic: "auction_detail.fxml", tags: ["Line code", "Flow"] },
    { path: "auction-server/src/test/java/com/auction/server/service/UserServiceTest.java", topic: "UserServiceTest", tags: ["Test", "Line code"] },
    { path: "auction-server/src/test/java/com/auction/server/service/ItemServiceTest.java", topic: "ItemServiceTest", tags: ["Test", "Line code"] },
    { path: "auction-server/src/test/java/com/auction/server/service/AuctionServiceTest.java", topic: "AuctionServiceTest", tags: ["Test", "Line code"] },
    { path: "auction-server/src/test/java/com/auction/server/service/AuctionSchedulerTest.java", topic: "AuctionSchedulerTest", tags: ["Test", "Line code"] },
    { path: "auction-server/src/test/java/com/auction/server/observer/BroadcastObserverTest.java", topic: "BroadcastObserverTest", tags: ["Test", "Line code"] },
    { path: "docs/Project_Architecture_Deep_Dive.md", topic: "Project_Architecture_Deep_Dive", tags: ["Design", "Debug", "Line code"] },
    { path: "docs/USER_AUTH_CONTRACT.md", topic: "USER_AUTH_CONTRACT", tags: ["Flow", "Design", "Test"] },
  ];

  for (const seed of genericSeeds) {
    const file = fileMap.get(seed.path);
    if (!file) continue;
    const refs = file.importantLines.slice(0, 3);
    refs.forEach((ref, index) => {
      questions.push({
        id: `${seed.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-line-${index + 1}`,
        level: file.layer === "Test" ? "Trung bình" : "Nâng cao",
        topic: seed.topic,
        question: `Mở ${seed.topic} và giải thích vì sao dòng \`${ref.code}\` là điểm neo quan trọng khi nói về ${seed.topic}.`,
        answer: `${file.summary} Dòng \`${ref.code}\` cho thấy phần quan trọng nhất của file này: ${ref.explain} Khi trả lời, hãy nói vai trò file trước, sau đó chỉ dòng này để chứng minh code thật rồi nối sang flow hoặc test liên quan.`,
        intent: `Luyện thói quen bám line code thật trong ${seed.topic}, không trả lời kiểu mô tả chung chung.`,
        answerBullets: [
          `Nêu vai trò file: ${file.summary}`,
          `Chỉ thẳng dòng L${ref.line}: ${ref.code}`,
          "Nối dòng đó sang flow, contract hoặc test đang được bảo vệ.",
        ],
        mustMention: unique([seed.topic, file.layer, path.basename(file.path)]),
        commonMistakes: [
          "Đọc nguyên câu comment hoặc code mà không nói tác dụng trong flow.",
          "Chỉ nói file này quan trọng nhưng không nối sang lớp kế tiếp.",
        ],
        tags: unique([...seed.tags, file.layer === "Test" ? "Test" : "Line code"]),
        filePath: file.path,
        lineRefs: [
          {
            line: ref.line,
            code: ref.code,
            explain: ref.explain,
          },
        ],
        followUps: [
          "Nếu bỏ hoặc sửa sai dòng này thì flow nào gãy đầu tiên?",
          "File nào gọi hoặc phụ thuộc trực tiếp vào điểm neo này?",
        ],
      });
    });
  }

  return questions
    .filter((question) => question.lineRefs.length > 0)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function main() {
  const files = walk(repoRoot).sort((left, right) => rel(left).localeCompare(rel(right)));
  const allFiles = walkAll(repoRoot);

  const projectCodeFiles = files.map((fullPath) => {
    const relativePath = rel(fullPath);
    const layer = layerFor(relativePath);
    const module = moduleFor(relativePath);
    const extension = path.extname(relativePath).toLowerCase() || path.basename(relativePath);
    const raw = readFileSync(fullPath, "utf8");
    const lines = raw.split(/\r?\n/);
    const { declarations, methods, importantLines: javaImportant } = parseJava(lines);
    const fxml = relativePath.endsWith(".fxml") ? parseFXML(lines) : null;
    const importantSource = fxml ? fxml.importantLines : javaImportant;
    const importantLines = importantSource.slice(0, 10).map((entry) => ({
      line: entry.line,
      code: entry.code,
      explain: lineExplain(entry.code, layer),
    }));

    return {
      path: relativePath,
      layer,
      module,
      extension,
      lineCount: lines.length,
      summary: summaryFor(relativePath, layer, lines),
      declarations: declarations.slice(0, 8),
      methods: methods.slice(0, 12),
      importantLines,
      fxml: fxml
        ? {
            controller: fxml.controller,
            controllerLine: fxml.controllerLine,
            actions: fxml.actions.slice(0, 12),
          }
        : null,
    };
  });

  const generatedManualCases = buildManualCases(projectCodeFiles);
  const generatedInterviewQuestions = buildQuestionBank(projectCodeFiles);
  const assetDocumentFiles = allFiles
    .map((fullPath) => rel(fullPath))
    .filter((relativePath) => /\.(svg|png|jpg|jpeg|gif|pdf|pptx|docx)$/i.test(relativePath))
    .slice(0, 40);

  const requiredDocs = ["README.md", "DESIGN.md", "docs/Project_Architecture_Deep_Dive.md", "docs/USER_AUTH_CONTRACT.md", "docs/RUN_SERVER_LOCAL.md"];
  const presentFiles = new Set(projectCodeFiles.map((file) => file.path));
  const missingTextFiles = requiredDocs.filter((file) => !presentFiles.has(file));

  const projectAudit = {
    projectLabel,
    totalFilesScanned: allFiles.length,
    codeMapFiles: projectCodeFiles.length,
    textFilesInInventory: files.length,
    assetDocumentFiles,
    intentionallyNotCodeMapped: [
      ".worktrees/**",
      ".venv/**",
      "target/**",
      "node_modules/**",
      "data/**",
    ],
    missingTextFiles,
    excludedDirectories: [...excludedDirs].sort(),
    includedExtensions: [...includedExtensions].sort(),
    note: "Generated for public web consumption. Paths are repository-relative only; no absolute local path is emitted.",
  };

  const payload = `/* Auto-generated by scripts/generate-learning-data.mjs for ${projectLabel}. */
export type GeneratedLineRef = { line: number; code: string; explain: string; path?: string };
export type GeneratedCodeFile = {
  path: string;
  layer: string;
  module: string;
  extension: string;
  lineCount: number;
  summary: string;
  declarations: { line: number; kind: string; name: string; code: string }[];
  methods: { line: number; name: string; code: string }[];
  importantLines: GeneratedLineRef[];
  fxml: null | { controller: string | null; controllerLine: number | null; actions: { action: string; line: number; code: string }[] };
};
export type GeneratedManualCase = {
  id: string;
  title: string;
  screen: string;
  role: string;
  steps: string[];
  expected: string;
  executionPath: GeneratedLineRef[];
};
export type GeneratedInterviewQuestion = {
  id: string;
  level: string;
  topic: string;
  question: string;
  answer: string;
  intent: string;
  answerBullets: string[];
  mustMention: string[];
  commonMistakes: string[];
  tags: string[];
  filePath: string;
  lineRefs: GeneratedLineRef[];
  followUps: string[];
};
export type ProjectAudit = {
  projectLabel: string;
  totalFilesScanned: number;
  codeMapFiles: number;
  textFilesInInventory: number;
  assetDocumentFiles: string[];
  intentionallyNotCodeMapped: string[];
  missingTextFiles: string[];
  excludedDirectories: string[];
  includedExtensions: string[];
  note: string;
};

export const generatedAt = ${JSON.stringify(new Date().toISOString())};
export const projectLabel = ${JSON.stringify(projectLabel)};
export const projectCodeFiles: GeneratedCodeFile[] = ${JSON.stringify(projectCodeFiles, null, 2)};
export const generatedManualCases: GeneratedManualCase[] = ${JSON.stringify(generatedManualCases, null, 2)};
export const generatedInterviewQuestions: GeneratedInterviewQuestion[] = ${JSON.stringify(generatedInterviewQuestions, null, 2)};
export const projectAudit: ProjectAudit = ${JSON.stringify(projectAudit, null, 2)};
`;

  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, payload, "utf8");

  console.log(`Generated learning data for ${projectLabel}`);
  console.log(`- repoRoot: ${repoRoot}`);
  console.log(`- code map files: ${projectCodeFiles.length}`);
  console.log(`- manual cases: ${generatedManualCases.length}`);
  console.log(`- interview questions: ${generatedInterviewQuestions.length}`);
  console.log(`- output: ${outFile}`);
}

main();
