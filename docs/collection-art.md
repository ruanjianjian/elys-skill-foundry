# Skill 短片：原画与制作记录

当前片库用不同的视觉世界介绍十个 Skill；engineering-delivery 保留并标记即将淘汰，新增 multi-agent-coding 见文末。**全部为能力示意，不是技能实际运行录屏、测试验收报告或上线证明。** 片中的样本、版本、票据和界面元素用于讲述工作方式，不代表真实业务评测分数、部署状态或本周实际成果。

## 制作方法

原画使用内置 `image_gen.imagegen` 生成。初批八个 Skill 各有一张原创主景；`ns-spec-cards` 延续已有的四张同角色分镜原画。没有将参考短片的截图、人物或配乐作为生产素材。

原画提供场景、材质、灯光和构图。动作由 Canvas 代码分别绘制：前景物体位移、变形、遮挡、检查与修补动作、纸张翻转、光束与样本通道，以及相应切镜。它们不是把同一张静图统一平移缩放，也不是九支换色字幕模板。每帧由时间参数确定，可以直接定位镜头并重复渲染。

配乐是九首分别编排的原创短曲，由 [纯 Python 合成脚本](../scripts/make-collection-score.py) 生成：没有调用音乐生成 API，也没有使用外部音乐或采样包。各片的乐器、节奏与编排分别定义，输出为 48 kHz 双声道 PCM16，再与画面合成。**尚未做耳听验证**；文件参数、采样与画面检查不等于对听感、音色或音画卡点的人耳验收。

## 原始九片与后续新增

| Skill                         | 时长 / BPM  | 视觉类型     | 动作叙事                                                                                            | 配乐标识        |
| ----------------------------- | ----------- | ------------ | --------------------------------------------------------------------------------------------------- | --------------- |
| ns-spec-cards                 | 16 秒 / 120 | 手绘叙事     | 长篇回复挤满工作台 → 收拢关键问题 → 逐卡选择与留言 → 回到清楚的下一步                               | `ink-rock`      |
| test-journal                  | 16 秒 / 110 | 纸片侦探     | 沿用户动线行走 → 放大镜抓住关键问题 → 剔除旧版本 → 把最新有效的截图串入核心动线册                   | `cut-paper`     |
| web-testing                   | 14 秒 / 128 | 超现实游乐场 | 光标触发操作 → 小球遇到断桥 → 补桥重走 → 到达可见结果并留下可复测路径                               | `bright-breaks` |
| mobile-testing                | 14 秒 / 124 | 城市穿行     | 从入口穿行多个页面 → 遇阻停下 → 修复继续 → 验证返回路径 → 留下关键体验路线                          | `noir-pulse`    |
| elys-backend-technical-design | 16 秒 / 100 | 建筑模型     | 发现连接缺口 → 拆开楼层与责任边界 → 对齐接口契约 → 重新接合并复位                                   | `architectural` |
| elys-code-development         | 14 秒 / 136 | 版画修理厂   | 复现机械卡点 → 沿契约找原因 → 修补关键部位 → 重走整条链并观察结果                                   | `garage`        |
| elys-evaluation               | 14 秒 / 116 | 光学实验     | 同一束输入分到参考与候选通道 → 显示差异 → 使用同批样本再测 → 保留样本、版本与记录；没有虚构百分比   | `prism`         |
| engineering-delivery          | 16 秒 / 126 | 夜航快递     | 同一 PR 包裹被待修标签拦下 → 修补 → 重新检查 → 装入纸飞机前行并留下评审结论；没有以绿灯表达线上部署 | `dispatch`      |
| codex-weekly-session-report   | 16 秒 / 92  | 编辑手账     | 散落记录与重复票据 → 去重 → 夹上来源标签 → 翻页入册 → 形成有来源的成果页                            | `jazz-collage`  |

代码分别位于 [people.js](../motion-collection/people.js)、[machines.js](../motion-collection/machines.js) 与 [stories.js](../motion-collection/stories.js)。`ns-spec-cards` 同时复用 [cinematic-renderer.js](../cinematic-renderer.js) 的角色分镜。

## 原画与生产文件对应

下列 JPG 是网页与 Canvas 消费的生产文件。原始完整分辨率 PNG 与生成记录另行保留；生产 JPG 是格式编码副本。

| Skill                         | 生产原画                                                                                                                                                           | 实际提示词记录                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| ns-spec-cards                 | [wide](../media/cinematic-art/wide.jpg)、[eye](../media/cinematic-art/eye.jpg)、[hand](../media/cinematic-art/hand.jpg)、[clean](../media/cinematic-art/clean.jpg) | [已有四张分镜的完整提示词与参考关系](cinematic-art.md)    |
| test-journal                  | [test-journal.jpg](../media/collection-art/test-journal.jpg)                                                                                                       | `prompts-people.json` → `testJournal`                     |
| web-testing                   | [web-testing.jpg](../media/collection-art/web-testing.jpg)                                                                                                         | `prompts-people.json` → `webTesting`                      |
| mobile-testing                | [mobile-testing.jpg](../media/collection-art/mobile-testing.jpg)                                                                                                   | `machines-prompts.json` → `mobile-testing`                |
| elys-backend-technical-design | [elys-backend-technical-design.jpg](../media/collection-art/elys-backend-technical-design.jpg)                                                                     | `machines-prompts.json` → `elys-backend-technical-design` |
| elys-code-development         | [elys-code-development.jpg](../media/collection-art/elys-code-development.jpg)                                                                                     | `machines-prompts.json` → `elys-code-development`         |
| elys-evaluation               | [elys-evaluation.jpg](../media/collection-art/elys-evaluation.jpg)                                                                                                 | `prompts-stories.md` → `elys-evaluation`                  |
| engineering-delivery          | [engineering-delivery.jpg](../media/collection-art/engineering-delivery.jpg)                                                                                       | `prompts-stories.md` → `engineering-delivery`             |
| codex-weekly-session-report   | [codex-weekly-session-report.jpg](../media/collection-art/codex-weekly-session-report.jpg)                                                                         | `prompts-stories.md` → `codex-weekly-session-report`      |

## 新增八张原画的完整实际提示词

以下内容从生成记录逐字收录，只添加文件对应标题。八张均独立调用内置工具生成，没有使用外部图片作为输入。`ns-spec-cards` 的 `eye`、`hand` 与 `clean` 则使用其原创 `wide` 主图保持角色和场景连续，详见上方旧记录。

### test-journal

生产文件：[`media/collection-art/test-journal.jpg`](../media/collection-art/test-journal.jpg)。

```text
Use case: illustration-story. Asset type: original cinematic macro tabletop scenery for an animated promotional short, 16:9 wide composition, no lettering. Create an exquisite physical handmade cut-paper detective world shot with a macro camera, tactile warm ivory cotton paper, charcoal cutout shadows, cranberry red clues, stop-motion miniature craft aesthetic. Main subject: a tiny original adult paper detective puppet (simple oval charcoal head, ivory trench coat with real visible folded edges, cranberry small scarf), standing on the RIGHT third of a cream paper desk. A magnifying glass lies angled beside the puppet. A miniature accordion scrapbook with blank ivory pages sits at lower right, partly open. On the LEFT and CENTRAL 60% leave a broad flat warm white paper stage with subtle fibers and faint warm side lighting, usable to animate a person walking and photographic evidence on top. A few loose off-white test list paper scraps trail at the far left margin, with very subtle unreadable printed pencil squiggles, no words. A spool of black thin film strip curves around the far perimeter. Refined genuinely hand-cut irregular edges, bent paper, tiny tape tabs, shallow contact shadows, tactile photographic craft, sophisticated editorial stop-motion set. Camera: high oblique tabletop view, 40mm macro, slightly above so the large central writing stage remains unblocked. Warm ivory, charcoal and deep cranberry only. Avoid photoreal human faces, computers, office scenes, glowing UI, sci-fi, diagrams, box charts, big typography, logos, watermarks. DO NOT place any readable text or numbers. All important miniature props remain in the right third and edges; the broad middle-left stage is deliberately empty for original animated foreground actions. Landscape 16:9.
```

### web-testing

生产文件：[`media/collection-art/web-testing.jpg`](../media/collection-art/web-testing.jpg)。

```text
Use case: stylized-concept. Asset type: original cinematic 16:9 wide 3D clay miniature scenery for a web-user-journey promotional animation, no text. An imaginative sunlit browser-as-amusement-park made from ivory ceramic and soft handmade clay, sky blue background and coral-pink/red accents. Large sculptural ivory browser window floats as a playful physical arch in the BACKGROUND across the middle. Three small terracotta coral circular browser dots are physically inset near its upper left, but there is NO text, no flat UI screenshot. In front, a long simple pale-blue clay walking path / ribbon bridge runs LEFT TO RIGHT across the LOWER MIDDLE at about 58% frame height, passing through a very simple single gap in its CENTER that can be covered by animated geometry. A giant rounded ivory clay button / stepping platform on the RIGHT; a small coral result flag on far right and a few soft low geometric clouds. A small whimsical white arrow cursor sculpture at the lower left edge, but leave a large clear central and left area open so a coded coral ball and dynamic cursor can cross the bridge. Physical playful miniature diorama with mature art direction like a crafted product film, soft long daylight shadows, high-end clay-render detail, powder-blue, ivory and restrained coral palette. Wide composition, safe margins. Main structural shapes simple enough to match with moving Canvas foreground bridge and ball. No people, no words, no numbers, no logos, no watermark, no process diagram, no screens within screens, no neon dark metal. Do not fill the frame with ornamental props. Landscape 16:9.
```

### mobile-testing

生产文件：[`media/collection-art/mobile-testing.jpg`](../media/collection-art/mobile-testing.jpg)。

```text
Use case: illustration-story. Asset type: original 16:9 cinematic backdrop for an animated promotional short about mobile app user journeys. Create a sophisticated hand printed woodcut / screenprint night-city scene, deep petroleum navy and smoky midnight blue with sparse warm amber station lamps, subtle ink grain and paper texture. A rain-polished elevated metro platform curves from the left foreground across the bottom toward a distant right-hand city doorway, with believable stairs, cables, train-window reflections, and human-scale architectural details. A small lone traveler silhouette stands far away near the right platform, showing a destination. The broad lower central foreground must be open and uncluttered, with no train, no large character, no phone, no UI panel: animated phone-door, tiny carriage, light traveler and a physical barrier will be drawn there later. Strong cinematic perspective, elegant high contrast, precise editorial illustration rather than a photograph or generic neon sci-fi. Leave upper-left dark sky usable for a very short overlay caption. No text, no logos, no watermark, no infographic arrows, no frames. Wide landscape 16:9, premium detailed original printmaking illustration.
```

### elys-backend-technical-design

生产文件：[`media/collection-art/elys-backend-technical-design.jpg`](../media/collection-art/elys-backend-technical-design.jpg)。

```text
Use case: stylized-concept. Asset type: original 16:9 cinematic backdrop for an animated architectural-model film. An exquisitely tactile architectural studio photographed like a museum miniature, a large warm-gray concrete drafting table receding in perspective, brutalist modular building maquettes and delicate structural study pieces along the rear and sides, a rolled material swatch, drafting tools, a tiny folded tracing sheet. Warm gray concrete, off-white paper, precise cold ice-blue reflected strip light, soft charcoal shadows, real material pores and subtle photographic grain. A broad open central foreground work surface is intentionally empty because three large moving concrete building modules, glass inserts, a bridge and exploded floors will be animated there later. Composition at a shallow elevated isometric angle, dramatic but calm studio lighting, physical scale and material tactility, no generic wireframe architecture, no computer screen, no flow-chart boxes or arrows. Upper-left wall quiet for a brief overlaid caption. No text or lettering, no logos or watermark. Wide 16:9 landscape, premium architectural model campaign visual.
```

### elys-code-development

生产文件：[`media/collection-art/elys-code-development.jpg`](../media/collection-art/elys-code-development.jpg)。

```text
Use case: illustration-story. Asset type: original 16:9 cinematic backdrop for an animated garage / repair-shop promotional short. A richly illustrated mechanic's workshop in striking black, mustard safety yellow and brick rust red, rough offset lithograph / linocut print with visible paper fiber, ink hatching, mismatched ink registration and expressive cinematic shadow. A large workbench fills lower foreground, behind it visible belt-drive machinery, a pegboard of real spanners, coiled cables, industrial lamp and mechanical parts. Rear-right contains the cropped shoulder and rolled-up rust-colored sleeve of a human mechanic, but NO visible hands in the central foreground: animated hand, wrench, gears and red warning lamp will be overlaid. Keep broad lower center workbench open and uncluttered for that foreground mechanism. Scene should feel like a tactile alternative-rock music video, energetic mature art direction, not a game UI or a children's cartoon. Upper-left darker wall available for a brief caption. No words or letters, no logo, no watermark, no diagrams, no floating icon stickers. Wide 16:9 landscape, detailed original illustration.
```

### elys-evaluation

生产文件：[`media/collection-art/elys-evaluation.jpg`](../media/collection-art/elys-evaluation.jpg)。

```text
Use case: stylized-concept.
Asset type: original landscape 16:9 cinematic optical experiment set for a short animation about comparative model evaluations. No people and no character illustration.
A physically crafted black optical laboratory bench in deep charcoal darkness, photographed as a premium scientific art film. A monumental transparent precision-cut triangular glass prism sits just left of center on a tactile brushed-black aluminum mount. Two understated parallel glass sample-channel rails and small frosted screens extend to the right, side-by-side at different depths, empty and unmarked. A narrow ray of white light from the far left reaches the prism and becomes faint spectral caustics, pale cyan, violet and amber (optical iridescence, not rainbow neon). Black void behind, subtle smoke only to make light tangible. Strong dramatic perspective along the bench, a few physical glass specimen slides near lower edge. Calm left dark margin, negative space around channels. The working foreground remains uncluttered for animated specimens.
Camera: low three-quarter macro wide angle, 16:9, not isometric diagram. High contrast material beauty, real light transport, deep depth, tactile glass edge and stainless precision. Visual world is optical instruments and light, absolutely distinct from comic people, paper craft, or UI design.
No text, no letters, no digits, no fake interface, no chart, no graph, no flowchart, no arrows, no logo, no watermark, no glossy human skin. Do not put glowing rings or generic science-fiction HUD overlays. Do not depict numeric results or claims. One coherent cinematic scene, not panels.
```

### engineering-delivery（即将淘汰）

生产文件：[`media/collection-art/engineering-delivery.jpg`](../media/collection-art/engineering-delivery.jpg)。

```text
Use case: stylized-concept.
Asset type: original 16:9 landscape crafted miniature night-airmail dispatch terminal, an animated film set.
An elaborate tactile papercraft and stop-motion miniature dispatch station at night, all built from folded aubergine-purple card, dark violet architectural paper and warm copper-orange paper edges. A copper-orange conveyor/rail enters from lower left, passes a small review arch around center, then curves toward a paper-aircraft launching rail at upper right. The architecture has layered folded roofs, small warm amber square windows and articulated mechanical paper parts. Deep purple sky, starless, moody theatrical pools of copper light, crisp construction folds, visible fibrous paper texture and tiny practical shadows. No people. A quiet foreground bay on the conveyor is EMPTY so an animated parcel can move through it later. Camera is close low three-quarter perspective with strong foreground-to-background depth, not isometric flowchart. Create a memorable cohesive miniature world with believable physical stagecraft, charming but not childish.
No text, no letters, no numbers, no labels, no stamp wording, no logos, no watermark, no green deployment-status lamp, no software UI. The arch must be a simple physical paper checking station, not airport realism. Do not include a flying aircraft or parcel yet. Keep key rail region readable, avoid clutter. No metallic cyberpunk neon, no comic character, no optical laboratory. One single film frame, not panels.
```

### codex-weekly-session-report

生产文件：[`media/collection-art/codex-weekly-session-report.jpg`](../media/collection-art/codex-weekly-session-report.jpg)。

```text
Use case: illustration-story.
Asset type: original 16:9 landscape sophisticated editorial collage and handmade book scene for a short film about evidence-based weekly work summaries.
A close overhead-oblique editorial still life on rich cream laid paper. An open handmade stitched journal lies center-right, its TWO large warm-white pages almost blank with visible natural paper fibers. Burgundy cloth spine, hand-cut graphite paper borders, small waxy burgundy corner tabs and brass binder clips. Around the outer edges sit a few cropped archive envelopes, deckled note fragments, monochrome halftone scraps, subtle ink scuffs and a charcoal pencil. The lower-left to center-left working area is calm cream negative space for moving receipts. The book and scraps have tangible layered depth, soft directional daylight and delicate shadows. A refined art-editor's desk, gallery catalog aesthetics, imperfect cut edges and precise composition. A hint of marbled graphite print on a paper corner but no readable content.
Color only warm cream, deep burgundy, graphite and a little muted brass. Tactile analog collage, quiet confidence, editorial warmth. No people, no screen, no glowing UI, no neon, no cartoon, no red utility jacket, no papercraft airport or lab. No text, no letters, no numbers, no placeholder writing, no logo, no watermark. Pages need clear blank spaces for compositing captions, source tags, and evidence later. A single coherent scene in 16:9, not poster panels.
```

## 新增：multi-agent-coding

内置 imagegen 制作的原创「会话调度台」，16 秒 / 126 BPM。原画：[multi-agent-coding.jpg](../media/collection-art/multi-agent-coding.jpg)；动作：[multi.js](../motion-collection/multi.js)。Claude 拆单 → 三个可见 Codex session 接单 → 反馈回到同一个 B-01 续修 → 结果回收后会话保留。只是能力示意，并非真实桌面录屏。配乐复用工程交付原创 `dispatch` 合成曲，无外部采样，未做耳听评价。

完整实际原画提示词：

```text
Use case: stylized-concept. Asset type: one original cinematic 16:9 wide master background for an animated film about a lead AI assigning work to three visible desktop coding sessions. Design an exquisite analogue session dispatch desk, a real physical tabletop control station, NOT a generic dashboard, NOT robots, no logos, no text. Warm burnt-orange painted metal desk in a beautifully lit small studio, ink-black shadows and deep cobalt blue physical desktop terminals, tactile matte resin, rubber cables, cream paper, subtle film grain, high-end handmade miniature product-film realism. Camera composition: wide straight-on view slightly above the tabletop, mild perspective but monitor screens nearly planar and easy to put live graphics onto. A large amber-orange lead desktop terminal sits on the LEFT 28% of the picture, with a completely BLANK warm-ivory monitor screen. Three smaller distinct dark-ink/cobalt desktop session terminals sit side by side across the RIGHT 65% of the picture. Their three completely BLANK slightly blue-ivory screen faces should be clearly separated and large enough to overlay legible simple text, all in one horizontal row and facing the camera. Each terminal has its own small keyboard and a visible orange/blue physical cable running back toward the lead station. Keep all four screen surfaces blank and free of glare, no pre-drawn UI. Between the stations and in the lower middle foreground, leave a large clean warm-orange writing/paper-routing area for moving task slips; a cream stack of small work-order sheets and a single pencil can sit at the lower left edge. Make the atmosphere feel like a thoughtfully crafted analogue office music-video set: strong architectural light, rich tactile surfaces, confident warm orange versus restrained cobalt accents, deep but readable shadows, restrained composition. No people, no humanoid robots, no conveyor industrial machinery, no phone, no flowchart, no floating panels, no arrows, no neon HUD, no readable letters or numbers, no watermark, no brand marks. Important: the story will be animated in code using the four physically present terminals and moving foreground papers, so all screens must remain blank and fully visible; don't fill the foreground work area with ornament. Landscape 16:9.
```
