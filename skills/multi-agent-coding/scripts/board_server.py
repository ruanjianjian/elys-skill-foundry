#!/usr/bin/env python3
"""Serve only the selected task board on loopback; never operate workers."""
import argparse
import html
import json
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def render(board: Path) -> bytes:
    text = board.read_text(encoding="utf-8")
    snapshot = {}
    error = None
    try:
        snapshot = json.loads((board.parent / 'task-status.json').read_text())
    except FileNotFoundError:
        error = '等待首轮监控数据'
    except (OSError, ValueError):
        error = '监控快照不可读，运行状态未知'
    stale = bool(snapshot) and time.time() - snapshot.get('checked_at', 0) > 120
    demo = snapshot.get('demo', False)
    esc = lambda value: html.escape(str(value or '—'))
    groups = [[], [], [], []]
    labels = {'running':'执行中','queued':'排队中','starting':'启动中','completed':'运行结束',
              'failed':'失败','blocked':'受阻','cancelled':'已取消','unknown':'状态未知'}
    for row in snapshot.get('tasks', []):
        status = 'unknown' if stale else row.get('status', 'unknown')
        review = row.get('review_state') or 'pending'
        bucket = 0 if status in ('unknown','failed','blocked','cancelled') or row.get('error') else 3 if review == 'accepted' else 2 if status == 'completed' else 1
        progress = row.get('progress') or ['暂无进度更新']
        if isinstance(progress, str):
            progress = [progress]
        detail = ''.join(f'<dt>{label}</dt><dd>{esc(row.get(key))}</dd>' for label,key in
                         [('Session','thread_id'),('工作目录','cwd'),('执行阶段','phase'),('任务 ID','job_id')])
        visibility = '桌面已核对' if row.get('visibility') == 'verified' else '桌面待核对'
        review_label = '复核通过' if review == 'accepted' else '等待 Lead 复核' if status == 'completed' else '尚未复核'
        card = f"""<article class="task"><div class="task-top"><span class="mono">{esc(row.get('id'))}</span><span class="badge b{bucket}">{esc(labels.get(status,status))}</span></div>
        <h3>{esc(row.get('title') or row.get('id'))}</h3><p class="progress">{esc(progress[-1])}</p>
        {('<p class="error">'+esc(row['error'])+'</p>') if row.get('error') else ''}
        <div class="task-foot"><span>{visibility}</span><span>{review_label}</span></div>
        <details><summary>任务详情 <span>＋</span></summary><dl>{detail}</dl></details></article>"""
        groups[bucket].append(card)
    columns = ''.join(f'<section class="lane"><h2><i class="dot d{i}"></i>{title}<span class="count">{len(groups[i])}</span></h2>'+(''.join(groups[i]) or '<div class="empty">'+empty+'</div>')+'</section>' for i,(title,empty) in enumerate([
        ('需关注','目前没有异常任务'),('执行中','暂无执行中的任务'),('待复核','暂无待复核任务'),('已通过','复核通过的任务会显示在这里')]))
    updated = time.strftime('%H:%M:%S', time.localtime(snapshot.get('checked_at', board.stat().st_mtime)))
    notice = '演示数据 · 未启动开发任务' if demo else '监控快照过期，当前运行状态未知' if stale else error or '每 15 秒刷新 · 以最新查询为准'
    css = """
    *{box-sizing:border-box}body{margin:0;background:#f5f5f2;color:#252823;font:14px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6}
    .shell{max-width:1560px;margin:auto;padding:0 36px 40px}header{height:76px;border-bottom:1px solid #dcded7;display:flex;align-items:center;justify-content:space-between;gap:16px}.brand{font-size:17px;font-weight:650;letter-spacing:-.4px}.brand b{display:inline-grid;place-items:center;width:29px;height:29px;background:#273c31;color:white;border-radius:7px;margin-right:10px;font-size:15px}.subtle{color:#646b62;font-size:12px}.intro{display:flex;justify-content:space-between;align-items:flex-end;padding:35px 0 26px;gap:20px}.eyebrow{font-size:11px;letter-spacing:2px;color:#586354;font-weight:650}h1{font-size:30px;letter-spacing:-1px;margin:5px 0 7px;font-weight:650}.intro p{margin:0;color:#646b62}.summary{display:flex;gap:28px}.metric strong{font-size:27px;font-weight:550;display:block;line-height:1.3}.metric span{font-size:12px;color:#646b62}.notice{border-top:1px solid #dcded7;border-bottom:1px solid #dcded7;padding:12px 0;display:flex;justify-content:space-between;gap:16px;color:#62695e;font-size:12px}.columns{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;padding:24px 0 32px}.lane h2{font-size:13px;display:flex;align-items:center;gap:8px;margin:0 0 14px}.dot{width:7px;height:7px;border-radius:50%;background:#879282}.d0{background:#ba693e}.d1{background:#4b796a}.d2{background:#a58b43}.d3{background:#6a7d5c}.count{margin-left:auto;color:#7d8479;font-weight:400}.task{background:#fff;border:1px solid #dfe2d9;border-radius:10px;padding:16px;margin-bottom:12px;box-shadow:0 2px 3px #26332604}.task-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.mono{font:11px ui-monospace,monospace;color:#697263}.badge{font-size:10px;padding:2px 7px;border-radius:4px;background:#edf0ea;color:#4b5944}.b0{background:#faece2;color:#914820}.b1{background:#e9f3ee;color:#35604c}.b2{background:#f5f0df;color:#796321}h3{font-size:15px;font-weight:600;line-height:1.5;margin:14px 0 9px;overflow-wrap:anywhere}.progress{font-size:12px;color:#596154;line-height:1.8;margin:0 0 18px;overflow-wrap:anywhere}.task-foot{display:flex;flex-wrap:wrap;gap:5px 12px;font-size:10px;color:#737c6c;margin-bottom:12px}.error{font-size:12px;color:#914820;overflow-wrap:anywhere}details{border-top:1px solid #eceee7}summary{cursor:pointer;padding-top:10px;font-size:11px;color:#687160;list-style:none;display:flex;justify-content:space-between;min-height:30px}summary:focus-visible{outline:2px solid #47705c;outline-offset:3px}dl{font-size:11px;margin:12px 0 0}dt{color:#747c70;margin-top:8px}dd{margin:2px 0 0;overflow-wrap:anywhere}.empty{border:1px dashed #d9ddd3;border-radius:9px;padding:25px 16px;font-size:12px;color:#747b6f}.ledger{border-top:1px solid #dcded7;padding-top:14px}.ledger summary{font-size:13px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.8 ui-monospace,monospace;background:#eeefe9;padding:20px;border-radius:8px}.footer{margin-top:24px;font-size:11px;color:#72796e}@media(max-width:1050px){.columns{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.shell{padding:0 18px 24px}header{height:64px}.intro{display:block;padding:24px 0}.summary{margin-top:22px}h1{font-size:25px}.columns{grid-template-columns:1fr}.notice{flex-wrap:wrap;gap:4px}.subtle{font-size:10px}} 
    """
    return f"""<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="15"><title>Fleet · 任务看板</title><style>{css}</style></head>
    <body><main class="shell"><header><div class="brand"><b>F</b>Fleet <span class="subtle">/ 协作工作台</span></div><span class="subtle">MULTI-AGENT CODING</span></header>
    <div class="intro"><div><div class="eyebrow">TASK OVERVIEW</div><h1>任务总览</h1><p>跟进执行，处理阻塞，确认交付。</p></div><div class="summary"><div class="metric"><strong>{sum(map(len,groups))}</strong><span>全部任务</span></div><div class="metric"><strong>{len(groups[0])}</strong><span>需关注</span></div><div class="metric"><strong>{len(groups[3])}</strong><span>复核通过</span></div></div></div>
    <div class="notice"><span>{esc(notice)}</span><span>最近查询 {updated}</span></div><div class="columns">{columns}</div>
    <details class="ledger"><summary>Lead 台账与依赖记录 <span>展开查看 ＋</span></summary><pre>{esc(text)}</pre></details>
    <p class="footer">运行结束 ≠ 验收通过 · 复核状态由 Lead 记录</p></main></body></html>""".encode()


def make_handler(board: Path):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path not in ("/", "/task-board"):
                self.send_error(404)
                return
            try:
                payload = render(board)
            except (OSError, UnicodeError):
                self.send_error(503, "Task board unavailable")
                return
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'")
            self.end_headers()
            self.wfile.write(payload)
    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ledger", type=Path, required=True)
    parser.add_argument("--port", type=int, default=8737)
    args = parser.parse_args()
    board = args.ledger.resolve() / "task-board.md"
    if not board.is_file():
        parser.error("ledger must contain task-board.md")
    if not 0 <= args.port <= 65535:
        parser.error("invalid port")
    with ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(board)) as server:
        print(f"Task board: http://127.0.0.1:{server.server_port}", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
