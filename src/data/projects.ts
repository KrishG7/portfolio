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
  demo: 'bits' | 'graph' | 'rain' | 'syscalls';
  film: 'bits' | 'graph' | 'rain' | 'sys';
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
      { h: 'Docking can rank binding affinity for resistant mutations', out: 'failed', note: 'On the gold-standard cases nothing was actually scored by docking; every result fell back to proximity.' },
      { h: 'Proximity to the binding pocket alone separates resistant from sensitive', out: 'failed', note: 'Tested as the fallback claim and it missed. Written up in ISSUES.md before anyone demoed it.' },
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
    year: '2025 — 2026',
    role: 'ML engineer, team ATMOSYNC',
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
      { h: 'Heavy-rain tails need their own model', out: 'held', note: 'A generalised Pareto tail splice fixed cells the blend was wrongly calling zero.' },
      { h: 'Outer-joining sources is harmless', out: 'failed', note: 'It silently stretched an axis and wasted memory. Found, fixed and covered by a test.' },
    ],
    limits: ['A research prototype, not an IMD or NCMRWF product. Any warning it shows is a demonstration.'],
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
    year: '2025',
    role: 'Sole author',
    stack: ['Go', 'ptrace', 'Docker', 'WebSockets', 'React Flow', 'Monaco'],
    areas: ['systems', 'security'],
    repo: 'https://github.com/KrishG7/SysCV',
    demo: 'syscalls',
    problem:
      'System calls are where a program actually touches the machine, and they are invisible. strace prints a wall of text; nobody learns the kernel from that.',
    built: [
      'A Go server that compiles your C statically and runs it under ptrace inside a Docker sandbox.',
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
      { h: 'Dynamic linking noise can be filtered after the fact', out: 'failed', note: 'Static compilation with -O0 removed it at the source, so the first events you see are your code.' },
      { h: 'ptrace can run natively on macOS', out: 'failed', note: 'It cannot. Linux in Docker made the tool work the same everywhere.' },
    ],
    limits: ['Collect-then-replay means long-running programs are traced to completion before you can step through them.'],
  },
];

export const minors: Minor[] = [
  { name: 'Brahm-Kosh', line: 'A static-analysis engine and 3D viewer that shows what breaks if you change a file. No LLM calls.', areas: ['systems'], stack: ['Python', 'AST', 'Three.js'], repo: 'https://github.com/KrishG7/Brahm-Kosh', year: '2025' },
  { name: 'Wait Zero', line: 'Offline-first OPD queues for clinics on unreliable networks, with emergency interrupts and geofenced check-in.', areas: ['health', 'systems'], stack: ['Flutter', 'Node', 'SQLite', 'MySQL'], repo: 'https://github.com/KrishG7/smart-clinic-booking', year: '2025' },
  { name: 'TriNetra', line: 'Satellite indices, crop-price forecasting and vernacular soil advice for Indian farmers.', areas: ['ml', 'data'], stack: ['PyTorch', 'Earth Engine', 'FastAPI'], repo: 'https://github.com/KrishG7/TriNetra-Farmers-Stack', year: '2025' },
  { name: 'Video-Tracer', line: 'From raw video to a trained YOLO tracker with trajectories and ROI tripwires.', areas: ['ml'], stack: ['YOLOv8', 'ByteTrack', 'BoT-SORT'], repo: 'https://github.com/KrishG7/Video-Tracer', year: '2025' },
  { name: 'Stock Anomaly', line: 'Unsupervised anomaly detection on equities where most of the code exists to prove nothing sees the future.', areas: ['ml', 'data'], stack: ['pandas', 'scikit-learn', 'DBSCAN'], repo: 'https://github.com/KrishG7/stock-anomaly-detection', year: '2025' },
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
