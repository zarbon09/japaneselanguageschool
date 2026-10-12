const ALLOWED_PREFECTURES = new Set(["tokyo", "osaka"]);
const schools = (window.SCHOOLS || [])
  .filter((school) => {
    const place = String(school.city || school.prefecture || "").toLowerCase();
    return ALLOWED_PREFECTURES.has(place);
  })
  .map((school) => ({
    ...school,
    website: officialWebsite(school.website),
  }));

function officialWebsite(url) {
  const value = String(url || "").trim();
  if (!value || /\/search\/college\.php/i.test(value)) return "";
  return value;
}

const steps = [
  {
    key: "level",
    title: "What is your Japanese level now?",
    help: "Be honest — schools place you with a test either way.",
    options: [
      { value: "none", label: "None / a few phrases" },
      { value: "n5", label: "Beginner (around N5)" },
      { value: "n4", label: "Lower intermediate (N4)" },
      { value: "n3plus", label: "N3 or higher" },
    ],
  },
  {
    key: "goal",
    title: "What matters most?",
    help: "Pick the primary reason you would move for school.",
    options: [
      { value: "general", label: "General Japanese / daily life" },
      { value: "jlpt", label: "JLPT certification" },
      { value: "university", label: "Path to a Japanese university" },
      { value: "short", label: "Short course (working holiday or already in Japan)" },
    ],
  },
  {
    key: "duration",
    title: "How long do you plan to study?",
    help: "Student visas usually need a longer full-time program.",
    options: [
      { value: 3, label: "Up to 3 months" },
      { value: 6, label: "About 6 months" },
      { value: 12, label: "1 year" },
      { value: 24, label: "18–24 months" },
    ],
  },
  {
    key: "city",
    title: "Where do you want to live?",
    help: "This catalog is Tokyo and Osaka only for now. “Any” keeps both.",
    options: [
      { value: "any", label: "No strong preference" },
      ...[...new Set(schools.map((school) => school.prefecture).filter(Boolean))]
        .sort()
        .map((pref) => ({ value: pref.toLowerCase(), label: pref })),
    ],
  },
  {
    key: "visa",
    title: "What is your visa situation?",
    help: "Confirm visa sponsorship with the school before you apply.",
    options: [
      { value: "need", label: "I need a student visa" },
      { value: "have", label: "I already have status in Japan" },
      { value: "wh", label: "Working holiday / other short stay" },
    ],
  },
];

const answers = {};
let stepIndex = 0;

const quiz = document.getElementById("quiz");
const quizBody = document.getElementById("quiz-body");
const progressFill = document.getElementById("quiz-progress-fill");
const browseResults = document.getElementById("browse-results");
const cityChips = document.getElementById("city-chips");

document.querySelectorAll("[data-open-quiz]").forEach((btn) => {
  btn.addEventListener("click", openQuiz);
});

document.querySelectorAll("[data-close-quiz]").forEach((btn) => {
  btn.addEventListener("click", closeQuiz);
});

quiz.addEventListener("click", (event) => {
  if (event.target === quiz) closeQuiz();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !quiz.hidden) closeQuiz();
});

if (cityChips) {
  const prefectures = [...new Set(schools.map((school) => school.city).filter(Boolean))].sort();
  cityChips.innerHTML = prefectures
    .map((city) => {
      const label = schools.find((school) => school.city === city)?.prefecture || city;
      return `<button type="button" class="chip" data-browse="${city}">${label}</button>`;
    })
    .join("");
}

document.querySelectorAll("[data-browse]").forEach((chip) => {
  chip.addEventListener("click", () => {
    setActiveChips("[data-browse]", chip);
    renderBrowse(
      schools.filter((school) => school.city === chip.dataset.browse),
      chip.textContent
    );
  });
});

document.querySelectorAll("[data-browse-goal]").forEach((chip) => {
  chip.addEventListener("click", () => {
    setActiveChips("[data-browse-goal]", chip);
    const goal = chip.dataset.browseGoal;
    renderBrowse(
      schools.filter((school) => school.goals.includes(goal)),
      chip.textContent
    );
  });
});

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function displayOrDash(value) {
  const text = String(value ?? "").trim();
  return text ? escapeHtml(text) : "Not listed";
}

function housingLabel(school) {
  if (school.accommodations) return school.accommodations;
  if (school.dorm === true) return "Available";
  if (school.dorm === false) return "Unavailable";
  return "";
}

function resultLink(href, label) {
  if (!href) return `<span>${label}: Not listed</span>`;
  const safe = escapeHtml(href);
  return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

function setActiveChips(selector, active) {
  document.querySelectorAll(selector).forEach((el) => el.classList.remove("is-active"));
  active.classList.add("is-active");
}

function openQuiz() {
  stepIndex = 0;
  Object.keys(answers).forEach((key) => delete answers[key]);
  quiz.hidden = false;
  document.body.style.overflow = "hidden";
  renderStep();
}

function closeQuiz() {
  quiz.hidden = true;
  document.body.style.overflow = "";
}

function renderStep() {
  const step = steps[stepIndex];
  const total = steps.length;
  progressFill.style.width = `${((stepIndex + 1) / (total + 1)) * 100}%`;

  quizBody.innerHTML = `
    <div class="quiz-step">
      <p class="eyebrow">Step ${stepIndex + 1} of ${total}</p>
      <h2>${step.title}</h2>
      <p class="quiz-help">${step.help}</p>
      <div class="options">
        ${step.options
          .map(
            (opt) => `
          <button class="option ${answers[step.key] === opt.value ? "is-selected" : ""}" type="button" data-value="${opt.value}">
            ${opt.label}
          </button>`
          )
          .join("")}
      </div>
      <div class="quiz-nav">
        <button class="btn btn-ghost" type="button" data-back ${stepIndex === 0 ? "disabled" : ""}>Back</button>
        <button class="btn btn-primary btn-sm" type="button" data-next>Continue</button>
      </div>
    </div>
  `;

  quizBody.querySelectorAll(".option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const raw = btn.dataset.value;
      answers[step.key] = step.key === "duration" ? Number(raw) : raw;
      quizBody.querySelectorAll(".option").forEach((el) => el.classList.remove("is-selected"));
      btn.classList.add("is-selected");
    });
  });

  quizBody.querySelector("[data-back]").addEventListener("click", () => {
    if (stepIndex > 0) {
      stepIndex -= 1;
      renderStep();
    }
  });

  quizBody.querySelector("[data-next]").addEventListener("click", () => {
    if (answers[step.key] === undefined) return;
    if (stepIndex < steps.length - 1) {
      stepIndex += 1;
      renderStep();
    } else {
      renderResults();
    }
  });
}

function scoreSchool(school) {
  let score = 55;
  const reasons = [];

  if (answers.visa === "need") {
    if (!school.visa) return { score: 0, reasons: [], disqualified: true };
    score += 12;
  }
  if ((answers.visa === "have" || answers.visa === "wh") && school.shortTerm) {
    score += 8;
    reasons.push("Has a course around one year or shorter");
  }
  if (answers.visa === "wh" && school.visa && !school.shortTerm && answers.duration <= 3) {
    score -= 15;
  }

  if (answers.goal === "jlpt") {
    score -= 4;
  } else if (school.goals.includes(answers.goal)) {
    score += 14;
    reasons.push("Program type matches your primary goal");
  } else {
    score -= 10;
  }

  if (answers.city === "any" || school.city === answers.city) {
    score += 10;
    if (answers.city !== "any") reasons.push(`Located in ${school.citiesLabel}`);
  } else {
    score -= 18;
  }

  if (answers.duration >= school.durationMinMonths) {
    score += 6;
  } else if (answers.visa === "need") {
    score -= 20;
    reasons.push("Your planned length may be short for the listed courses");
  }

  if (answers.level === "none" && school.goals.includes("general")) {
    score += 4;
  }
  if (answers.level === "n3plus" && school.university) {
    score += 4;
  }

  if (school.conditionCount === 0) score += 3;

  score = Math.max(0, Math.min(99, Math.round(score)));
  const why = reasons.slice(0, 3);
  if (why.length < 2) why.push(...school.why.slice(0, 2 - why.length));
  return { score, reasons: why, disqualified: false, tradeoff: school.tradeoff };
}

function renderResults() {
  progressFill.style.width = "100%";
  const ranked = schools
    .map((school) => ({ school, ...scoreSchool(school) }))
    .filter((row) => !row.disqualified)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  quizBody.innerHTML = `
    <div class="quiz-step">
      <p class="eyebrow">Your matches</p>
      <h2>Schools ranked for this plan</h2>
      <p class="quiz-help">Tokyo and Osaka only (${schools.length} schools). Scores are fit, not prestige.</p>
      ${
        ranked.length
          ? ranked
              .map((row) => {
                const school = row.school;
                return `
        <article class="result-item">
          <div class="result-head">
            <h3>${escapeHtml(school.name)}</h3>
            <span class="score">${row.score}%</span>
          </div>
          <p class="quiz-help">${escapeHtml(school.prefecture || "")}</p>
          <dl class="result-facts">
            <div><dt>Address</dt><dd>${displayOrDash(school.address)}</dd></div>
            <div><dt>Phone</dt><dd>${displayOrDash(school.phone)}</dd></div>
            <div><dt>FAX</dt><dd>${displayOrDash(school.fax)}</dd></div>
            <div><dt>URL</dt><dd>${
              officialWebsite(school.website)
                ? `<a href="${escapeHtml(officialWebsite(school.website))}" target="_blank" rel="noopener noreferrer">${escapeHtml(officialWebsite(school.website))}</a>`
                : "Not listed"
            }</dd></div>
            <div><dt>E-Mail</dt><dd>${
              school.email
                ? `<a href="mailto:${escapeHtml(school.email)}">${escapeHtml(school.email)}</a>`
                : "Not listed"
            }</dd></div>
          </dl>
          <p class="tradeoff">Contact school for further information</p>
        </article>`;
              })
              .join("")
          : `<p>No school in this catalog survives your filters. Browse Tokyo or Osaka instead, or go back and change visa or location.</p>`
      }
      <div class="quiz-nav">
        <button class="btn btn-ghost" type="button" data-restart>Retake</button>
        <button class="btn btn-primary btn-sm" type="button" data-close-quiz>Done</button>
      </div>
    </div>
  `;

  quizBody.querySelector("[data-restart]").addEventListener("click", openQuiz);
  quizBody.querySelector("[data-close-quiz]").addEventListener("click", closeQuiz);
}

// School comparison: initial filters and side-by-side verified fields.
const comparisonIds = new Set();
let browseSource = schools;
const filterLocation = document.getElementById("compare-location");
const filterCourse = document.getElementById("compare-course");
const filterDuration = document.getElementById("compare-duration");
const comparePanel = document.getElementById("compare-panel");
const compareTable = document.getElementById("compare-table");
function knownDuration(school) {
  const description = String(school.courses || "");
  const matches = [...description.matchAll(/(\d+)\s*years?\s*(?:(\d+)\s*months?)?|(\d+)\s*months?/gi)];
  if (!matches.length) return null;
  return Math.min(...matches.map(m => m[3] ? Number(m[3]) : Number(m[1])*12 + Number(m[2]||0)));
}
function filterBrowse() {
  return browseSource.filter(school => {
    const city = filterLocation?.value || "all";
    const course = filterCourse?.value || "all";
    const duration = filterDuration?.value || "all";
    if (city !== "all" && String(school.city).toLowerCase() !== city) return false;
    if (course !== "all" && !(school.goals || []).includes(course) && !(course === "short" && school.shortTerm)) return false;
    if (duration !== "all") {
      const months = knownDuration(school);
      if (months === null) return false;
      if (duration === "short" && months > 6) return false;
      if (duration === "year" && (months <= 6 || months > 12)) return false;
      if (duration === "long" && months <= 12) return false;
    }
    return true;
  });
}
function safeSite(school) {
  const url = officialWebsite(school.website);
  return /^https?:\/\//i.test(url) ? url : "";
}
function updateComparison() {
  const selected = schools.filter(s => comparisonIds.has(s.id));
  comparePanel.hidden = !selected.length;
  document.getElementById("compare-count").textContent = selected.length + " of 4 schools selected";
  document.getElementById("compare-open").disabled = selected.length < 2;
  if (selected.length < 2) compareTable.hidden = true;
  if (!compareTable.hidden) showComparison();
}
function showComparison() {
  const selected = schools.filter(s => comparisonIds.has(s.id));
  if (selected.length < 2) return;
  const unknown = "Not verified";
  const rows = [
    ["Location",s => s.prefecture || unknown],
    ["Course type",s => (s.goals || []).map(g => ({general:"General Japanese",university:"University preparation",jlpt:"JLPT preparation",short:"Short-term"})[g] || g).join(", ") || unknown],
    ["Listed courses",s => s.courses || unknown],
    ["Course duration",s => knownDuration(s) !== null ? knownDuration(s) + " months (shortest listed)" : unknown],
    ["Annual tuition fees",s => unknown],
    ["Intake dates",s => unknown],
    ["Minimum Japanese proficiency",s => unknown],
    ["Accommodation",s => s.dorm === true ? "Listed as available" : s.dorm === false ? "Listed as unavailable" : unknown],
    ["Student capacity",s => s.capacity ?? unknown],
    ["Visa support",s => unknown],
    ["Official website",s => safeSite(s) ? '<a href="' + escapeHtml(safeSite(s)) + '" target="_blank" rel="noopener noreferrer">Visit website ↗</a>' : unknown]
  ];
  compareTable.innerHTML = '<table class="school-comparison"><thead><tr><th scope="col">Compare</th>' + selected.map(s=>'<th scope="col">'+escapeHtml(s.name)+'</th>').join("") + '</tr></thead><tbody>' + rows.map(([label,get])=>'<tr><th scope="row">'+escapeHtml(label)+'</th>'+selected.map(s=>'<td>'+ (label === "Official website" ? get(s) : escapeHtml(String(get(s)))) +'</td>').join("")+'</tr>').join("")+'</tbody></table><p class="compare-hint">Tuition, intake, language requirements and visa support will be added when verified. Confirm all details with each school.</p>';
  compareTable.hidden = false;
  compareTable.scrollIntoView({behavior:"smooth",block:"nearest"});
}
function renderBrowse(list) {
  browseSource = list;
  const visible = filterBrowse();
  browseResults.hidden = false;
  if (!visible.length) {
    browseResults.innerHTML = "<p>No schools match these filters. Try a different selection.</p>";
    return;
  }
  browseResults.innerHTML = visible.map(school => `
    <article class="school-card">
      <div><h3>${escapeHtml(school.name)}</h3>
      <p>${escapeHtml(school.citiesLabel || school.prefecture || "")} · ${escapeHtml(school.courses || "Courses not verified")} · capacity ${escapeHtml(String(school.capacity ?? "n/a"))}</p>
      ${safeSite(school) ? '<a href="' + escapeHtml(safeSite(school)) + '" target="_blank" rel="noopener noreferrer">Official website ↗</a>' : ""}
      </div>
      <label class="compare-pick"><input type="checkbox" data-compare-id="${escapeHtml(school.id)}" ${comparisonIds.has(school.id) ? "checked" : ""} ${!comparisonIds.has(school.id) && comparisonIds.size >= 4 ? "disabled" : ""}/> Compare</label>
    </article>`).join("");
}
browseResults.addEventListener("change",event=>{
  const input=event.target.closest("[data-compare-id]");
  if(!input)return;
  if(input.checked && comparisonIds.size >= 4){input.checked=false;return;}
  if(input.checked)comparisonIds.add(input.dataset.compareId);else comparisonIds.delete(input.dataset.compareId);
  renderBrowse(browseSource);
  updateComparison();
});
[filterLocation,filterCourse,filterDuration].forEach(control=>control?.addEventListener("change",()=>renderBrowse(browseSource)));
document.getElementById("compare-reset")?.addEventListener("click",()=>{
  filterLocation.value="all";filterCourse.value="all";filterDuration.value="all";renderBrowse(schools);
});
document.getElementById("compare-clear")?.addEventListener("click",()=>{comparisonIds.clear();compareTable.hidden=true;renderBrowse(browseSource);updateComparison();});
document.getElementById("compare-open")?.addEventListener("click",showComparison);
renderBrowse(schools);

// Homepage search and city shortcuts
const heroSearch = document.getElementById("hero-search");
if (heroSearch) {
  heroSearch.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = document.getElementById("school-search").value.trim().toLowerCase();
    const city = document.getElementById("school-city").value;
    const matches = schools.filter((school) => {
      const matchesCity = city === "any" || String(school.city || school.prefecture || "").toLowerCase() === city;
      const haystack = [school.name, school.city, school.prefecture, school.address].join(" ").toLowerCase();
      return matchesCity && (!query || haystack.includes(query));
    });
    document.querySelectorAll("[data-browse], [data-browse-goal]").forEach((chip) => chip.classList.remove("is-active"));
    renderBrowse(matches);
    document.getElementById("browse").scrollIntoView({ behavior: "smooth" });
  });
}
document.querySelectorAll("[data-city-link]").forEach((link) => {
  link.addEventListener("click", () => {
    const city = link.dataset.cityLink;
    document.querySelectorAll("[data-browse], [data-browse-goal]").forEach((chip) => chip.classList.remove("is-active"));
    document.querySelector(`[data-browse="${city}"]`)?.classList.add("is-active");
    renderBrowse(schools.filter((school) => String(school.city || "").toLowerCase() === city));
  });
});
