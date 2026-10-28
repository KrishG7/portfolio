// Every figure on the site is held back until it has been re-run (see the v10 board).
// Copy here describes what each system does and how, never a number we haven't verified.

export type Area = 'security' | 'ml' | 'systems' | 'health' | 'data';

export interface Step {
  k: string; // short label shown on the figure
  t: string;
  p: string;
}

export interface Flagship {
  slug: string;
  n: string;
  name: string;
  kicker: string;
  line: string;
  year: string;
  role: string;
  stack: string[];
  areas: Area[];
  repo: string;
  demo?: 'bits' | 'graph' | 'rain' | 'syscalls';
  film?: 'bits' | 'graph' | 'rain' | 'sys';
  video?: string; // file name (no extension) under /video, shown when the file exists
  facts?: { v: string; label: string; src: string }[];
  area: string;
  hook: string;
  body: string;
  caps: [string, string, string];
  problem: string;
  built: string[];
  steps: Step[];
  ledger: { h: string; out: 'held' | 'failed' | 'open'; note: string }[];
  limits: string[];
  team?: string;
}

export interface Minor {
  name: string;
  line: string;
  areas: Area[];
  stack: string[];
  repo: string;
  year: string;
  slug?: string;
}

export const flagships: Flagship[] = [
  {
    slug: 'aegis-tensor',
    film: 'bits',
    area: 'Security for machine learning',
    hook: 'A model file is a program you didn’t write.',
    body: 'Aegis reads safetensors, GGUF, PyTorch pickles, ONNX and Keras files without ever loading them, and gives one verdict with a next step. Then it disarms the weights anyway, because anyone who reads the public rules can tune a payload to slip under them.',
    caps: ['Reading float32 weights without loading them', 'Payload found in the low mantissa bits', 'Disarmed: low bits rounded away'],
    n: '01',
    name: 'Aegis-Tensor',
    kicker: 'Security × Machine Learning',
    line: 'Is this model file safe to load? One verdict, before a single byte of it runs.',
    year: '2026 — now',
    role: 'Sole author',
    stack: ['Python', 'safetensors', 'GGUF', 'ONNX', 'pickle VM', 'SARIF'],
    areas: ['security', 'ml'],
    repo: 'https://github.com/KrishG7/Aegis-Tensor',
    demo: 'bits',
    problem:
      'People download open-weight models from strangers and run them locally. A model file can carry a code-execution payload in its pickle, a template injection in its chat template, or data hidden in the low bits of its weights. Most tools either load the file to inspect it, which is the attack, or check one format.',
    built: [
      'A static scanner for safetensors, GGUF, PyTorch and pickle checkpoints, numpy, Keras and ONNX that never executes the file it reads.',
      'A pickle analyser that follows memoised strings and runtime-built callables, so payloads assembled in pieces are still resolved.',
      'Statistical checks for overwritten tensors, NaN/Inf injection and structured data hidden in mantissa bits.',
      'aegis disarm, which rounds away the low mantissa bits whether or not a payload was detected, because the rules are public and a payload can be tuned to sit under any threshold.',
    ],
    steps: [
      { k: 'read', t: 'Read, never load', p: 'Headers, opcodes and tensor bytes are parsed directly. Every malicious test fixture would drop a marker file if it ran; the tests check the marker is never there.' },
      { k: 'resolve', t: 'Resolve what the pickle would call', p: 'The pickle stream is walked like a VM: memo PUT/GET, STACK_GLOBAL and calls on call results, so os.system assembled from fragments is still os.system.' },
      { k: 'measure', t: 'Measure the weights', p: 'Float tensors are checked for overwrites, injected NaN/Inf and structure in the least significant mantissa bits.' },
      { k: 'disarm', t: 'Disarm regardless', p: 'Detection is not the safety net. Disarm zeroes the rounded-away bits for every tensor and refuses any width that would reach the exponent.' },
    ],
    ledger: [
      { h: 'Low-bit payloads can be detected statistically', out: 'failed', note: 'Random bits in the low mantissa are indistinguishable from noise. That is why disarm exists and runs on clean files too.' },
      { h: 'Structured payloads in the low bits are detectable', out: 'held', note: 'Text and code have structure that random rounding noise does not.' },
      { h: 'Payloads split across very small tensors are caught', out: 'open', note: 'A documented blind spot, tested and listed as a known limit.' },
    ],
    limits: [
      'Static rules are public, so an attacker who reads them can stay under every threshold. The answer is disarm, not more thresholds.',
      'Payloads split across tiny tensors are a known blind spot.',
    ],
  },
  {
    slug: 'athena',
    film: 'graph',
    area: 'Clinical evidence graph',
    hook: 'A second opinion that shows its sources.',
    body: 'For oncologists who have run out of standard leads on a rare cancer. Athena pulls a cited subgraph of evidence from CIViC and PubMed, remembers the case, and flags exactly which earlier findings a new result breaks.',
    caps: ['Case loaded: gene, variant, cancer type', 'Cited evidence pulled from the graph', 'New pathology: one finding invalidated'],
    n: '02',
    name: 'Athena',
    kicker: 'Clinical evidence graph',
    line: 'A second opinion for rare cancers that cites its sources instead of guessing confidently.',
    year: '2026',
    role: 'Core engineer, team SecondLook',
    video: 'athena',
    facts: [
      { v: '191 / 217', label: 'nodes and edges of curated CIViC sarcoma evidence in the graph (2,712 nodes once ClinicalTrials.gov is added)', src: 'counted on live CIViC data, 28 Oct 2026' },
      { v: '1,388', label: 'Python tests passing on our branch, plus 94 in the web client', src: 'run 28 Oct 2026, after one real bug fix' },
      { v: '13 in 4', label: 'tumour-board subsystems across four pull requests, all still open', src: 'PRs #128 to #132, checked 28 Oct 2026' },
    ],
    stack: ['Python', 'FalkorDB', 'Cypher', 'CIViC', 'PubMed', 'AutoDock Vina'],
    areas: ['ml', 'health'],
    repo: 'https://github.com/healers-second-look/Athena',
    demo: 'graph',
    team: 'healers-second-look',
    problem:
      'When an oncologist runs out of standard genomic leads, the tools left are search engines and chatbots. Neither tells you where a claim came from, and neither remembers what changed since the last tumour board.',
    built: [
      'A knowledge graph over CIViC and PubMed evidence in FalkorDB, queried live for a gene, a variant and a cancer type.',
      'Case memory that diffs new pathology, scans and labs against the last state and flags which earlier findings they invalidate.',
      'A structural-biology pipeline (docking, AlphaFold and AlphaMissense lookups) for cases where the evidence graph comes back empty.',
    ],
    steps: [
      { k: 'case', t: 'Start from the case', p: 'Gene, variant, cancer type and history become a query, not a prompt.' },
      { k: 'graph', t: 'Pull a cited subgraph', p: 'Cypher returns the evidence around the variant. Every edge carries the citation it came from.' },
      { k: 'diff', t: 'Diff what changed', p: 'A new result is compared with the last state of the case; findings it contradicts are marked invalidated, not silently kept.' },
      { k: 'board', t: 'Hand it to the board', p: 'The tumour board sees what is known, what changed and what is still unproven, in that order.' },
    ],
    ledger: [
      { h: 'Docking can rank binding affinity for resistant mutations', out: 'failed', note: 'On the nine gold-standard cases, none was scored by docking (0 of 9); every result fell back to proximity.' },
      { h: 'Proximity to the binding pocket alone separates resistant from sensitive', out: 'failed', note: 'It matched 7 of the 8 unambiguous cases (EGFR C797S was the miss), which the pre-committed bar counts as a fail. Written up in the repo before anyone demoed it.' },
      { h: 'Evidence retrieval keeps answers grounded', out: 'open', note: 'The model is told to cite only retrieved sources. That is an instruction, not an enforced guardrail, and the README says so.' },
    ],
    limits: [
      'LLM answers are instructed, not constrained, to use only retrieved evidence.',
      'The patient timeline uses one published reference dataset for every case until a real source is wired in.',
    ],
  },
  {
    slug: 'weavr',
    film: 'rain',
    area: 'Forecast blending · Smart India Hackathon',
    hook: 'Every rainfall model is right somewhere.',
    body: 'WEAVR learns how far to trust GraphCast, HRES and the ECMWF ensemble in each region of India at each lead time, blends them, and turns the blend into the exceedance probabilities IMD actually warns on.',
    caps: ['Three models, one India grid', 'Learning who to trust, region by region', 'Blend above the IMD warning threshold'],
    n: '03',
    name: 'WEAVR',
    kicker: 'Forecast blending · Smart India Hackathon',
    line: 'Weigh every rainfall model by how much it has earned, region by region and lead by lead.',
    year: '2026',
    role: 'ML engineer, team ATMOSYNC',
    video: 'weavr',
    facts: [
      { v: '193 → 0', label: 'false-zero probability cells after the extreme-value tail, at 115.6 and 204.5 mm (and SEDI gets worse at all five leads)', src: 'tail-repair-results.md, PR #100' },
      { v: '629', label: 'tests passing, with lint and type checks clean', src: 'org main, 28 Oct 2026' },
      { v: '11', label: 'of my pull requests merged; four more are open', src: 'GitHub, 29 Oct 2026' },
    ],
    stack: ['Python', 'xarray', 'Zarr', 'EMOS', 'BMA', 'GraphCast', 'IFS-ENS'],
    areas: ['ml', 'data'],
    repo: 'https://github.com/ATMOSYNC/WEAVR',
    demo: 'rain',
    team: 'ATMOSYNC',
    problem:
      'India’s monsoon is forecast by a crowd of models, physics-based and AI. Each is good somewhere, at some lead time, for some kind of rain. Averaging them throws away what is known about each one.',
    built: [
      'A blend of GraphCast, HRES and the IFS ensemble on a common 0.25° India grid, weighted per region and per lead time.',
      'A calibration ladder where each method has to beat the one below it: equal weights, regional weights, EMOS and BMA, then regime-conditioned.',
      'Probabilities at the rain thresholds IMD actually warns on, verified against rain-gauge analyses with a leave-one-year-out protocol.',
    ],
    steps: [
      { k: 'align', t: 'Put every model on one grid', p: 'Different resolutions, lead times and units become one aligned cube over India.' },
      { k: 'weigh', t: 'Learn who to trust where', p: 'Weights are learned per region and per lead from history, not set once for the whole country.' },
      { k: 'calibrate', t: 'Turn a number into a probability', p: 'Each calibration method is benchmarked against the last; it only ships if it wins.' },
      { k: 'verify', t: 'Verify without leaking', p: 'The year being tested is never seen in training. Every claim in the README links to the run that produced it.' },
    ],
    ledger: [
      { h: 'Heavy-rain tails need their own model', out: 'held', note: 'A generalised Pareto tail splice removed every false-zero cell (193 to 0). But SEDI got worse at all five leads, because the tail also adds false alarms.' },
      { h: 'Quantile mapping improves extreme-rain skill', out: 'open', note: 'SEDI at 115.6 mm improved at 5 of 5 leads. The price: threshold-weighted CRPS at 64.5 mm got worse at every lead, and RMSE rose by roughly 4 to 6 mm.' },
      { h: 'A stacked combiner beats both of its parents', out: 'failed', note: 'It failed at 2 of 5 leads; plain fixed-weight quantile averaging beat both parents at all five (open pull request).' },
      { h: 'Outer-joining sources is harmless', out: 'failed', note: 'It silently stretched the member axis to 55 and padded one model with 50 empty members, a 6.1 times larger array. Found and fixed. The same investigation found why the blend run kept being OOM-killed.' },
    ],
    limits: ['A research prototype, not an IMD or NCMRWF product. Any warning it shows is a demonstration.', 'Results mix one-season and two-season runs; each table says which. The committed H7 verdict file is stale (the measured verdict is in the README).'],
  },
  {
    slug: 'syscv',
    film: 'sys',
    area: 'Linux internals',
    hook: 'Watch a program ask the kernel for things.',
    body: 'Write C in the browser. SysCV runs it under ptrace inside a Linux container and replays every system call it made, with a live graph of the files, memory and output it touched.',
    caps: ['Program compiled and started under ptrace', 'Each syscall stopped, read and decoded', 'Exit. Every call replayable, step by step'],
    n: '04',
    name: 'SysCV',
    kicker: 'Linux internals',
    line: 'Watch a C program talk to the kernel, one system call at a time.',
    year: '2026',
    role: 'Sole author',
    video: 'syscv',
    facts: [
      { v: '10 of 10', label: 'end-to-end scenarios pass (file I/O, memory, fork, signals, exec, output flood, SIGSEGV)', src: 'tests/test_comprehensive.js, 28 Oct 2026' },
      { v: 'About 60 / 40', label: 'syscall definitions for x86-64 / ARM64', src: 'table_amd64.go (62) and table_arm64.go (40)' },
      { v: 'One week', label: 'start to finish, 9 commits, all mine', src: 'git history, 9 to 15 Apr 2026' },
    ],
    stack: ['Go', 'ptrace', 'Docker', 'WebSockets', 'React Flow', 'Monaco'],
    areas: ['systems', 'security'],
    repo: 'https://github.com/KrishG7/SysCV',
    demo: 'syscalls',
    problem:
      'System calls are where a program actually touches the machine, and they are invisible. strace prints a wall of text; nobody learns the kernel from that.',
    built: [
      'A Go server that compiles your C with gcc and runs it under ptrace inside a Linux container.',
      'Architecture-specific register reading for x86-64 and ARM64 to recover each call’s arguments and return value.',
      'A replayable timeline and a kernel graph where file descriptors, heap growth and reads and writes appear as the program makes them.',
    ],
    steps: [
      { k: 'write', t: 'Write C in the browser', p: 'A Monaco editor and one Run button. Nothing to install but Docker.' },
      { k: 'trace', t: 'Trace under ptrace', p: 'The program runs in a Linux container; every syscall entry and exit stops the tracee so registers can be read.' },
      { k: 'hydrate', t: 'Hydrate the arguments', p: 'Raw registers become paths, buffers and flags, with a plain-English line for each call.' },
      { k: 'replay', t: 'Step through the kernel', p: 'Collect, then replay: step back and forth while the kernel graph grows and shrinks with the program.' },
    ],
    ledger: [
      { h: 'A static binary would give a cleaner trace', out: 'failed', note: 'Static glibc adds threading and futex setup that can deadlock the tracer, so programs are linked dynamically on purpose. The cost: the first calls you see are the loader starting up, before main().' },
      { h: 'The tracer can run natively on a Mac', out: 'failed', note: 'It reads Linux registers and Linux syscall numbers, so it needs Linux. Docker makes it behave the same everywhere.' },
      { h: 'A Dockerfile that built last April builds today', out: 'failed', note: 'The base image had reached end of life and its package mirrors returned 404, so a fresh build failed. Moved to a current base and checked from scratch.' },
    ],
    limits: ['Collect-then-replay means long-running programs are traced to completion before you can step through them.', 'It runs any C you give it, so it is a local tool: I would not host it publicly.', 'Only the common syscalls are decoded (a curated table, not every call).'],
  },
];

// Smaller projects that still get a full page: a film instead of an animated figure.
export const studies: Flagship[] = [
  {
    slug: 'brahm-kosh',
    video: 'brahm-kosh',
    area: 'Developer tools',
    hook: 'Read a codebase before you touch it.',
    body: '',
    caps: ['', '', ''],
    n: '05',
    name: 'Brahm-Kosh',
    kicker: 'Developer tools',
    line: 'A static-analysis engine and 3D map that shows what breaks if you change a file. No LLM calls.',
    year: '2026',
    role: 'Sole author',
    stack: ['Python', 'ast', 'click', 'Three.js', 'SSE'],
    areas: ['systems'],
    repo: 'https://github.com/KrishG7/Brahm-Kosh',
    facts: [
      { v: '61', label: 'tests passing (58 at first check, 3 added with the ignore-file fix)', src: 'pytest, 28 Oct 2026' },
      { v: '13', label: 'language adapters; only Python is parsed with a real syntax tree', src: '`brahm-kosh list-adapters`, 28 Oct 2026' },
      { v: 'One week', label: 'start to finish, 35 commits, all mine', src: 'git history, 20 to 27 Apr 2026' },
    ],
    problem: 'You open an unfamiliar codebase. Where do you start, and what breaks if you change this file? A folder tree answers neither.',
    built: [
      'A universal model (project, module, file, symbol) filled by 13 language adapters, with a complexity score per symbol and per file.',
      'A real import graph, so it can answer both directions: which files break if you change this one, and what this one relies on, several hops out.',
      'Flags for monolithic files, files nothing imports, files that mix many concerns, and files that look ready to split.',
      'A local server that draws it as a 3D map, repaints live when files change, and only binds to 127.0.0.1.',
    ],
    steps: [
      { k: 'analyse', t: 'Parse without running', p: 'Each adapter reads its language and emits the same model. Python uses the real AST; the other twelve use curated patterns.' },
      { k: 'connect', t: 'Resolve the imports', p: 'Cross-file imports become a dependency graph, which is what makes impact analysis possible.' },
      { k: 'judge', t: 'Flag the hotspots', p: 'Complexity, dead files, mixed concerns and split candidates are computed from the graph, not guessed.' },
      { k: 'explore', t: 'Fly around it', p: 'Search a file, see its blast radius, read its symbols and code, all in one panel.' },
    ],
    ledger: [
      { h: 'The ignore file keeps unwanted folders out', out: 'failed', note: 'It filtered nothing: the 13 adapters walked the tree themselves. Found while verifying, fixed centrally, with three tests written to fail first.' },
      { h: 'A tree-sitter parser for every language', out: 'open', note: 'Chosen against, to avoid a binary dependency. Twelve languages use regular expressions, which is a documented trade-off.' },
    ],
    limits: ['Only Python gets a true syntax tree; other languages are read more loosely.', 'Not tried on very large repositories.', 'Ignore patterns are cached per root, so editing the file during watch mode needs a restart.'],
  },
  {
    slug: 'wait-zero',
    video: 'wait-zero',
    area: 'Healthcare software · team of six',
    hook: 'A clinic queue you can actually see.',
    body: '',
    caps: ['', '', ''],
    n: '06',
    name: 'Wait Zero',
    kicker: 'Healthcare software · team of six',
    line: 'Live tokens, emergency interrupts and offline-first booking for clinics on unreliable networks.',
    year: '2026',
    role: 'Lead developer and architect, team of six',
    stack: ['Node', 'Express', 'MySQL', 'React', 'Flutter', 'SQLite'],
    areas: ['health', 'systems'],
    repo: 'https://github.com/KrishG7/smart-clinic-booking',
    team: 'six-person course',
    facts: [
      { v: '115', label: 'backend tests passing (database mocked); 2 web and 4 Flutter tests as well', src: 'run 28 Oct 2026' },
      { v: '258', label: 'commits across the team, March to May 2026; mine are about a quarter', src: 'git history' },
      { v: '1 real bug', label: 'a MySQL 8 migration that failed silently; the mocked tests and CI both hid it', src: 'found against a real database, 28 Oct 2026' },
    ],
    problem: 'Clinics lose hours to unmanaged queues and patchy internet. A patient takes a slip of paper and has no idea whether they are next or an hour away.',
    built: [
      'The architecture: a Node and MySQL API with JWT and OTP sign-in, role checks (patient, doctor, staff, admin), audit logs and PII encryption.',
      'A queue where booking creates a token, calling the next patient recalculates every wait, and an emergency token can jump to the front within a daily limit.',
      'Three views of one system: a patient dashboard, a doctor queue console, and an admin view that approves new doctors.',
      'An offline-first Flutter app that saves bookings locally and syncs them when the network returns.',
    ],
    steps: [
      { k: 'patient', t: 'The patient sees their place', p: 'A live token, minutes of estimated wait and how many people are ahead.' },
      { k: 'doctor', t: 'The doctor runs the queue', p: 'Call next moves a token to in progress and every wait behind it is recomputed.' },
      { k: 'admin', t: 'The admin keeps it safe', p: 'New doctors wait for approval; every account and action is recorded.' },
      { k: 'sync', t: 'The phone works offline', p: 'Bookings are stored in SQLite and pushed to the server when the connection returns.' },
    ],
    ledger: [
      { h: 'A migration that runs in CI runs in production', out: 'failed', note: 'It used MariaDB-only syntax, so on MySQL 8 two columns never existed and skipping a token returned HTTP 500. The 115 tests mock the database and CI ended the step with `|| true`. Only a real run showed it. Fixed with an idempotent migration.' },
      { h: 'Dates survive the trip to the browser', out: 'failed', note: 'Date columns reached clients as the previous day (an IST shift). Fixed so they arrive as plain strings.' },
    ],
    limits: ['The demo uses seed data; the people on screen are made up.', 'The mobile app was exercised as a web build, and GPS check-in has not been tried on a real phone.', 'The marketing landing page carries placeholder statistics that were never measured; this page does not use them.'],
  },
  {
    slug: 'trinetra',
    video: 'trinetra',
    area: 'Agri-tech · hackathon prototype',
    hook: 'Three questions every farmer has.',
    body: '',
    caps: ['', '', ''],
    n: '07',
    name: 'TriNetra',
    kicker: 'Agri-tech · hackathon prototype',
    line: 'Satellite crop-health checks, a demo price model and soil advice in local languages, in one farmer dashboard.',
    year: '2026',
    role: 'Sole author',
    stack: ['FastAPI', 'Next.js', 'PyTorch', 'Earth Engine', 'Gemini'],
    areas: ['ml', 'data'],
    repo: 'https://github.com/KrishG7/TriNetra-Farmers-Stack',
    facts: [
      { v: '4 days', label: 'from first commit to last, 12 commits, all mine', src: 'git history, 24 to 27 Jan 2026' },
      { v: '68 / 100', label: 'crop-health score for one real Punjab cropland point (NDVI 0.68); a low-NDVI field scored 0 and was marked high risk', src: 'live Earth Engine run, 28 Oct 2026' },
      { v: 'Not measured', label: 'price-forecast accuracy: no held-out test was ever run', src: 'train_market_ai.py, checked 28 Oct 2026' },
    ],
    problem: 'A farmer wants to know what to grow, when to sell and whether anyone will lend money. Each answer needs a different kind of data.',
    built: [
      'Credit Vision: Sentinel-2 imagery through Google Earth Engine checks a location is farmland, then scores crop health (NDVI and NDWI) against the yield being claimed.',
      'Soil Vision: a hard rule for impossible pH first, then a Gemini model turns N, P, K, pH and rainfall into a crop, fertiliser doses and a plain explanation in seven languages.',
      'Market Vision: a small PyTorch model draws a seven-day price curve with a hold or sell hint.',
      'A FastAPI backend, a Next.js dashboard, and OTP sign-in whose registration flow I fixed and tested.',
    ],
    steps: [
      { k: 'sell', t: 'When to sell', p: 'Pick crop, state, market and date; get a seven-day curve and a hint.' },
      { k: 'grow', t: 'What to grow', p: 'Soil numbers in, advice out, with a rule that refuses impossible soil before any AI is asked.' },
      { k: 'borrow', t: 'Will a bank lend', p: 'A pin on a field becomes a satellite check of whether it is farmland and how healthy the crop is.' },
    ],
    ledger: [
      { h: 'The price model forecasts prices', out: 'failed', note: 'Its training history is a seasonal curve I generated, not market data, and the 87% confidence figure was a hard-coded constant. I dropped the claim and corrected the README. It shows the pipeline, not forecasting skill.' },
      { h: 'Satellite scoring works as a credit score', out: 'open', note: 'The cropland filter and NDVI path work with real credentials, but the number is a crop-health score that ignores the season, so fallow land can look risky.' },
      { h: 'Registration by OTP works', out: 'failed', note: 'The new-user OTP route called a function that did not exist and always returned HTTP 500. Fixed, with tests, and the register route now refuses unverified phones.' },
    ],
    limits: ['The home-screen statistics are placeholders.', 'Soil answers take 35 to 50 seconds and vary between runs; the agronomy has not been reviewed by an agronomist.', 'The OTP is only printed to the server log; there is no SMS provider.'],
  },
];

export const allCases: Flagship[] = [...flagships, ...studies];

export const minors: Minor[] = [
  { slug: 'brahm-kosh', name: 'Brahm-Kosh', line: 'A static-analysis engine and 3D viewer that shows what breaks if you change a file. No LLM calls.', areas: ['systems'], stack: ['Python', 'AST', 'Three.js'], repo: 'https://github.com/KrishG7/Brahm-Kosh', year: '2026' },
  { slug: 'wait-zero', name: 'Wait Zero', line: 'Offline-first OPD queues for clinics on unreliable networks, with emergency interrupts and geofenced check-in.', areas: ['health', 'systems'], stack: ['Flutter', 'Node', 'SQLite', 'MySQL'], repo: 'https://github.com/KrishG7/smart-clinic-booking', year: '2026' },
  { slug: 'trinetra', name: 'TriNetra', line: 'Satellite crop-health checks, a demo price model and soil advice in local languages, in one farmer dashboard.', areas: ['ml', 'data'], stack: ['PyTorch', 'Earth Engine', 'FastAPI'], repo: 'https://github.com/KrishG7/TriNetra-Farmers-Stack', year: '2026' },
  { name: 'Video-Tracer', line: 'From raw video to a trained YOLO tracker with trajectories and ROI tripwires.', areas: ['ml'], stack: ['YOLOv8', 'ByteTrack', 'BoT-SORT'], repo: 'https://github.com/KrishG7/Video-Tracer', year: '2026' },
  { name: 'Stock Anomaly', line: 'Unsupervised anomaly detection on equities where most of the code exists to prove nothing sees the future.', areas: ['ml', 'data'], stack: ['pandas', 'scikit-learn', 'DBSCAN'], repo: 'https://github.com/KrishG7/stock-anomaly-detection', year: '2026' },
];

export const areaLabel: Record<Area, string> = {
  security: 'Security',
  ml: 'Machine learning',
  systems: 'Systems',
  health: 'Health',
  data: 'Data',
};

export const site = {
  name: 'Krish Gupta',
  role: 'Security for machine learning',
  email: 'krishgupta3879@gmail.com',
  github: 'https://github.com/KrishG7',
  linkedin: 'https://www.linkedin.com/in/krish-gupta007/',
  leetcode: 'https://leetcode.com/u/KrishGupta0007/',
  now: 'Aegis-Tensor',
};
