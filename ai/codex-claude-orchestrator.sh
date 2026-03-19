#!/usr/bin/env bash
# =============================================================================
# Codex + Claude Code 协作编排器
# Codex 负责编码，Claude Code 负责严格验收
# =============================================================================

set -euo pipefail

# ======================== 配置区 ========================
PROJECT_DIR="${PROJECT_DIR:-.}"                    # 项目目录
TASKS_FILE="${TASKS_FILE:-}"                       # 单文件模式：指定具体 JSON 文件
TASKS_DIR="${TASKS_DIR:-}"                         # 目录模式：加载目录下所有 JSON 文件
LOG_DIR="${LOG_DIR:-./review-logs}"                # 审查日志目录
MAX_RETRIES="${MAX_RETRIES:-3}"                     # 每个模块最大重试次数
CODEX_MODEL="${CODEX_MODEL:-gpt-5.4}"              # Codex 使用的模型
CLAUDE_MODEL="${CLAUDE_MODEL:-claude-opus-4-6}"  # Claude Code 使用的模型

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ======================== 工具函数 ========================
log_info()  { echo -e "${BLUE}[INFO]${NC}  $(date '+%H:%M:%S') $*"; }
log_ok()    { echo -e "${GREEN}[PASS]${NC}  $(date '+%H:%M:%S') $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%H:%M:%S') $*"; }
log_fail()  { echo -e "${RED}[FAIL]${NC}  $(date '+%H:%M:%S') $*"; }

mkdir -p "$LOG_DIR"

# ======================== 前置检查 ========================
check_prerequisites() {
    log_info "检查工具链..."

    if ! command -v codex &>/dev/null; then
        log_fail "未找到 codex CLI，请先安装: npm i -g @openai/codex"
        exit 1
    fi

    if ! command -v claude &>/dev/null; then
        log_fail "未找到 claude CLI，请先安装 Claude Code"
        exit 1
    fi

    # 至少需要指定 TASKS_FILE 或 TASKS_DIR 之一
    if [ -z "$TASKS_FILE" ] && [ -z "$TASKS_DIR" ]; then
        # 默认回退：优先 ai/tasks/ 目录，其次 ai/tasks.json
        if [ -d "ai/tasks" ]; then
            TASKS_DIR="ai/tasks"
            log_info "自动检测到 ai/tasks/ 目录，进入目录模式"
        elif [ -f "ai/tasks.json" ]; then
            TASKS_FILE="ai/tasks.json"
            log_info "自动检测到 ai/tasks.json，进入单文件模式"
        else
            log_fail "未找到任务文件或目录，请设置 TASKS_FILE 或 TASKS_DIR"
            exit 1
        fi
    fi

    if [ -n "$TASKS_FILE" ] && [ ! -f "$TASKS_FILE" ]; then
        log_fail "未找到任务文件: $TASKS_FILE"
        log_info "请先创建任务文件，格式参考 tasks.example.json"
        exit 1
    fi

    if [ -n "$TASKS_DIR" ] && [ ! -d "$TASKS_DIR" ]; then
        log_fail "未找到任务目录: $TASKS_DIR"
        exit 1
    fi

    log_ok "工具链检查通过"
}

# ======================== Step 1: Codex 编码 ========================
run_codex_coding() {
    local task_name="$1"
    local task_prompt="$2"
    local attempt="$3"
    local log_file="${LOG_DIR}/${task_name}_codex_attempt${attempt}.log"

    log_info "[$task_name] Codex 开始编码 (第 ${attempt} 次)..."

    # 使用 codex exec 非交互模式执行编码任务
    codex exec \
        --full-auto \
        --model "$CODEX_MODEL" \
        --output-last-message "${LOG_DIR}/${task_name}_codex_output.txt" \
        "$task_prompt" \
        2>&1 | tee "$log_file"

    local exit_code=${PIPESTATUS[0]}

    if [ $exit_code -ne 0 ]; then
        log_fail "[$task_name] Codex 编码失败 (exit code: $exit_code)"
        return 1
    fi

    log_ok "[$task_name] Codex 编码完成"
    return 0
}

# ======================== Step 2: Claude Code 验收 ========================
run_claude_review() {
    local task_name="$1"
    local task_requirements="$2"
    local attempt="$3"
    local review_file="${LOG_DIR}/${task_name}_review_attempt${attempt}.json"

    log_info "[$task_name] Claude Code 开始验收审查..."

    # 获取 Codex 本次提交的 diff
    local diff_content
    diff_content=$(git diff HEAD~1 HEAD 2>/dev/null || git diff)

    # 构造严格的验收 prompt
    local review_prompt
    review_prompt=$(cat <<PROMPT
你是一位严格的代码验收工程师。请对以下代码变更进行全面审查。

## 模块需求
${task_requirements}

## 代码变更 (Git Diff)
\`\`\`diff
${diff_content}
\`\`\`

## 验收标准（全部通过才能标记为 PASS）

1. **功能完整性**: 是否完整实现了需求中的所有功能点？
2. **代码质量**: 是否有明显的 bug、逻辑错误、边界条件未处理？
3. **错误处理**: 是否有充分的错误处理和异常捕获？
4. **类型安全**: 类型定义是否完善？（如适用）
5. **安全性**: 是否存在安全隐患（注入、XSS、敏感信息泄露等）？
6. **性能**: 是否有明显的性能问题（N+1查询、内存泄漏等）？
7. **可维护性**: 代码结构是否清晰，命名是否合理？
8. **测试覆盖**: 是否包含了必要的测试？

## 输出格式（严格 JSON）

{
  "verdict": "PASS" 或 "FAIL",
  "score": 0-100,
  "checklist": {
    "functionality": { "pass": bool, "notes": "..." },
    "code_quality": { "pass": bool, "notes": "..." },
    "error_handling": { "pass": bool, "notes": "..." },
    "type_safety": { "pass": bool, "notes": "..." },
    "security": { "pass": bool, "notes": "..." },
    "performance": { "pass": bool, "notes": "..." },
    "maintainability": { "pass": bool, "notes": "..." },
    "test_coverage": { "pass": bool, "notes": "..." }
  },
  "critical_issues": ["..."],
  "suggestions": ["..."],
  "fix_instructions": "如果 FAIL，给出具体的修复指令供 Codex 执行"
}

只输出 JSON，不要有其他内容。
PROMPT
)

    # 使用 Claude Code headless 模式进行审查
    claude -p "$review_prompt" \
        --model "$CLAUDE_MODEL" \
        --output-format json \
        --max-turns 3 \
        > "$review_file" 2>"${LOG_DIR}/${task_name}_claude_stderr.log"

    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_fail "[$task_name] Claude Code 审查过程出错"
        return 2
    fi

    # 解析审查结果
    local verdict
    verdict=$(jq -r '.result // .content // . | if type == "string" then . else tostring end' "$review_file" \
        | grep -oP '"verdict"\s*:\s*"\K[^"]+' || echo "UNKNOWN")

    if [ "$verdict" == "PASS" ]; then
        log_ok "[$task_name] Claude Code 验收通过!"
        return 0
    elif [ "$verdict" == "FAIL" ]; then
        log_fail "[$task_name] Claude Code 验收未通过"

        # 提取修复指令
        local fix_instructions
        fix_instructions=$(jq -r '.result // .content // . | if type == "string" then . else tostring end' "$review_file" \
            | grep -oP '"fix_instructions"\s*:\s*"\K[^"]+' || echo "")

        if [ -n "$fix_instructions" ]; then
            echo "$fix_instructions" > "${LOG_DIR}/${task_name}_fix_instructions.txt"
            log_info "[$task_name] 修复指令已保存"
        fi
        return 1
    else
        log_warn "[$task_name] 无法解析审查结果，视为未通过"
        return 1
    fi
}

# ======================== Step 3: 运行测试 ========================
run_tests() {
    local task_name="$1"
    log_info "[$task_name] 运行自动化测试..."

    # 根据任务名前缀和项目类型选择测试命令
    # 合约任务（C- 前缀）使用 Hardhat
    if [[ "$task_name" == C-* ]] && [ -f "packages/contracts/hardhat.config.ts" ]; then
        log_info "[$task_name] 检测到合约任务，运行 Hardhat 测试..."
        pnpm --filter contracts test 2>&1 | tee "${LOG_DIR}/${task_name}_test.log"
    # 后端任务（B- 前缀）运行 server 类型检查
    elif [[ "$task_name" == B-* ]] && [ -f "apps/server/package.json" ]; then
        log_info "[$task_name] 检测到后端任务，运行 TypeScript 类型检查..."
        pnpm --filter server typecheck 2>&1 | tee "${LOG_DIR}/${task_name}_test.log"
    # 前端任务（F- 前缀）运行前端类型检查
    elif [[ "$task_name" == F-* ]] && [ -f "apps/web/package.json" ]; then
        log_info "[$task_name] 检测到前端任务，运行 TypeScript 类型检查..."
        pnpm --filter web typecheck 2>&1 | tee "${LOG_DIR}/${task_name}_test.log"
    # AI Agent 任务（A- 前缀）运行 server 类型检查（agent 代码在 apps/server 中）
    elif [[ "$task_name" == A-* ]] && [ -f "apps/server/package.json" ]; then
        log_info "[$task_name] 检测到 AI Agent 任务，运行 TypeScript 类型检查..."
        pnpm --filter server typecheck 2>&1 | tee "${LOG_DIR}/${task_name}_test.log"
    # P1 任务（P1- 前缀）运行全量类型检查
    elif [[ "$task_name" == P1-* ]] && [ -f "pnpm-workspace.yaml" ]; then
        log_info "[$task_name] 检测到 P1 任务，运行全量 TypeScript 类型检查..."
        pnpm typecheck 2>&1 | tee "${LOG_DIR}/${task_name}_test.log"
    # pnpm monorepo 根目录：运行全量测试
    elif [ -f "pnpm-workspace.yaml" ]; then
        log_info "[$task_name] 检测到 pnpm monorepo，运行全量类型检查..."
        pnpm typecheck 2>&1 | tee "${LOG_DIR}/${task_name}_test.log"
    elif [ -f "pytest.ini" ] || [ -f "pyproject.toml" ]; then
        pytest 2>&1 | tee "${LOG_DIR}/${task_name}_test.log"
    elif [ -f "go.mod" ]; then
        go test ./... 2>&1 | tee "${LOG_DIR}/${task_name}_test.log"
    elif [ -f "Cargo.toml" ]; then
        cargo test 2>&1 | tee "${LOG_DIR}/${task_name}_test.log"
    else
        log_warn "[$task_name] 未检测到测试框架，跳过测试"
        return 0
    fi

    return ${PIPESTATUS[0]}
}

# ======================== 核心流程: 编码 → 验收循环 ========================
process_task() {
    local task_name="$1"
    local task_prompt="$2"
    local task_requirements="$3"

    echo ""
    echo "=================================================================="
    log_info "开始处理模块: $task_name"
    echo "=================================================================="

    for attempt in $(seq 1 "$MAX_RETRIES"); do
        log_info "[$task_name] === 第 ${attempt}/${MAX_RETRIES} 轮 ==="

        # --- 阶段 1: Codex 编码 ---
        local coding_prompt="$task_prompt"

        # 如果是重试，附加上一次的修复指令
        local fix_file="${LOG_DIR}/${task_name}_fix_instructions.txt"
        if [ $attempt -gt 1 ] && [ -f "$fix_file" ]; then
            local fix_instructions
            fix_instructions=$(cat "$fix_file")
            coding_prompt="${task_prompt}

=== 上一次验收反馈（必须修复） ===
${fix_instructions}"
            log_info "[$task_name] 已附加上轮修复指令"
        fi

        if ! run_codex_coding "$task_name" "$coding_prompt" "$attempt"; then
            log_fail "[$task_name] 编码阶段失败，重试..."
            continue
        fi

        # --- 阶段 1.5: 运行测试 ---
        if ! run_tests "$task_name"; then
            log_warn "[$task_name] 测试未通过，但继续进入审查阶段"
        fi

        # --- 阶段 2: Claude Code 验收 ---
        if run_claude_review "$task_name" "$task_requirements" "$attempt"; then
            log_ok "[$task_name] 模块验收通过! (第 ${attempt} 轮)"
            # 创建验收通过的 git tag
            git tag -a "reviewed/${task_name}/v${attempt}" \
                -m "Claude Code 验收通过 - attempt ${attempt}" 2>/dev/null || true
            return 0
        fi

        if [ $attempt -eq "$MAX_RETRIES" ]; then
            log_fail "[$task_name] 已达最大重试次数 ($MAX_RETRIES)，模块未通过验收"
            return 1
        fi

        log_warn "[$task_name] 准备第 $((attempt + 1)) 轮修复..."
    done
}

# ======================== 主流程 ========================
main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║   Codex (编码) + Claude Code (验收) 协作编排器       ║"
    echo "╚══════════════════════════════════════════════════════╝"
    echo ""

    check_prerequisites

    cd "$PROJECT_DIR"

    local passed=0
    local failed=0
    local failed_tasks=()

    # 收集所有需要处理的任务文件
    local task_files=()
    if [ -n "$TASKS_DIR" ]; then
        while IFS= read -r -d '' f; do
            task_files+=("$f")
        done < <(find "$TASKS_DIR" -maxdepth 1 -name "*.json" -print0 | sort -z)
        log_info "目录模式: 共 ${#task_files[@]} 个任务文件 → ${TASKS_DIR}/"
    else
        task_files=("$TASKS_FILE")
        log_info "单文件模式: ${TASKS_FILE}"
    fi

    # 统计总任务数
    local total_tasks=0
    for tf in "${task_files[@]}"; do
        local cnt
        cnt=$(jq '.tasks | length' "$tf")
        total_tasks=$((total_tasks + cnt))
    done
    log_info "共 ${total_tasks} 个模块待处理"

    # 逐文件、逐模块执行
    for tf in "${task_files[@]}"; do
        local file_task_count
        file_task_count=$(jq '.tasks | length' "$tf")
        local file_desc
        file_desc=$(jq -r '.description // .project // ""' "$tf")
        [ -n "$file_desc" ] && log_info ">>> 文件: $(basename "$tf") — ${file_desc}"

        for i in $(seq 0 $((file_task_count - 1))); do
            local name=$(jq -r ".tasks[$i].name" "$tf")
            local prompt=$(jq -r ".tasks[$i].coding_prompt" "$tf")
            local requirements=$(jq -r ".tasks[$i].acceptance_criteria" "$tf")

            if process_task "$name" "$prompt" "$requirements"; then
                ((passed++))
            else
                ((failed++))
                failed_tasks+=("$name")
            fi
        done
    done

    # ======================== 最终报告 ========================
    echo ""
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║                    最终验收报告                       ║"
    echo "╚══════════════════════════════════════════════════════╝"
    echo ""
    log_info "总模块数: ${total_tasks}"
    log_ok   "通过: ${passed}"
    [ $failed -gt 0 ] && log_fail "未通过: ${failed} (${failed_tasks[*]})"
    echo ""
    log_info "详细日志: ${LOG_DIR}/"

    [ $failed -eq 0 ] && exit 0 || exit 1
}

main "$@"
