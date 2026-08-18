const dataUrl = new URL("../../data/submarkets/noho-fitzrovia.json", import.meta.url);

const createElement = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

const formatSqFt = (value) => new Intl.NumberFormat("en-GB").format(value);

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const formatAnimatedNumber = (value, decimals, prefix, suffix) => {
  const number = Number(value).toLocaleString("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${prefix}${number}${suffix}`;
};

const configureCounter = (element, { target, decimals = 0, prefix = "", suffix = "", label }) => {
  element.dataset.countTarget = String(target);
  element.dataset.countDecimals = String(decimals);
  element.dataset.countPrefix = prefix;
  element.dataset.countSuffix = suffix;
  element.textContent = formatAnimatedNumber(0, decimals, prefix, suffix);
  if (label) element.setAttribute("aria-label", label);
};

const animateCounter = (element) => {
  if (element.dataset.animated === "true") return;
  element.dataset.animated = "true";
  const target = Number(element.dataset.countTarget);
  const decimals = Number(element.dataset.countDecimals || 0);
  const prefix = element.dataset.countPrefix || "";
  const suffix = element.dataset.countSuffix || "";

  if (reducedMotion) {
    element.textContent = formatAnimatedNumber(target, decimals, prefix, suffix);
    return;
  }

  const duration = 1150;
  const started = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - started) / duration);
    const eased = 1 - ((1 - progress) ** 3);
    element.textContent = formatAnimatedNumber(target * eased, decimals, prefix, suffix);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const animateGauge = (gauge) => {
  if (gauge.dataset.animated === "true") return;
  gauge.dataset.animated = "true";
  const target = Number(gauge.dataset.scoreTarget);

  if (reducedMotion) {
    gauge.style.setProperty("--score", target);
    return;
  }

  const duration = 1150;
  const started = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - started) / duration);
    const eased = 1 - ((1 - progress) ** 3);
    gauge.style.setProperty("--score", target * eased);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const initialiseInViewAnimations = () => {
  const animatedGroups = document.querySelectorAll(".hero-facts, .score-card");
  const reveal = (group) => {
    group.querySelectorAll("[data-count-target]").forEach(animateCounter);
    group.querySelectorAll("[data-score-target]").forEach(animateGauge);
  };

  if (reducedMotion || !("IntersectionObserver" in window)) {
    animatedGroups.forEach(reveal);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      reveal(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.72 });

  animatedGroups.forEach((group) => observer.observe(group));
};

const getInitials = (name) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 3)
  .map((word) => word[0])
  .join("")
  .toUpperCase();

const renderHero = (data) => {
  document.querySelectorAll("[data-title]").forEach((element) => {
    element.textContent = data.title;
  });
  document.querySelectorAll("[data-period]").forEach((element) => {
    element.textContent = data.period;
  });

  const heroImage = document.querySelector("[data-hero-image]");
  const mapImage = document.querySelector("[data-map-image]");
  if (heroImage) heroImage.src = data.heroImage;
  if (mapImage) mapImage.src = data.mapImage;

  const facts = document.getElementById("hero-facts");
  data.heroFacts.forEach((fact) => {
    const item = createElement("div", "hero-fact");
    const value = createElement("strong", "hero-fact-value");
    configureCounter(value, {
      target: fact.target,
      decimals: fact.decimals,
      prefix: fact.prefix,
      suffix: fact.suffix,
      label: fact.value,
    });
    item.append(
      createElement("span", "hero-fact-label", fact.label),
      value,
    );
    facts.appendChild(item);
  });
};

const lineClass = (line) => `line-${line.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;

const mapLineLabel = (line) => line === "Hammersmith & City" ? "H&C" : line;

let activeMapButton = null;

const closeMapPopup = (returnFocus = false) => {
  const popup = document.getElementById("map-popup");
  if (!popup || popup.hidden) return;
  popup.hidden = true;
  popup.replaceChildren();
  if (activeMapButton) {
    activeMapButton.setAttribute("aria-expanded", "false");
    activeMapButton.classList.remove("is-active");
    if (returnFocus) activeMapButton.focus();
  }
  activeMapButton = null;
};

const positionMapPopup = (button) => {
  const map = document.getElementById("interactive-map");
  const popup = document.getElementById("map-popup");
  if (!map || !popup || popup.hidden) return;

  const mapRect = map.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();
  const markerX = buttonRect.left + (buttonRect.width / 2) - mapRect.left;
  const markerY = buttonRect.top + (buttonRect.height / 2) - mapRect.top;
  const gutter = 12;
  const left = Math.max(gutter, Math.min(markerX - (popupRect.width / 2), map.clientWidth - popupRect.width - gutter));
  const preferredTop = markerY > map.clientHeight / 2
    ? markerY - popupRect.height - 18
    : markerY + 18;
  const top = Math.max(gutter, Math.min(preferredTop, map.clientHeight - popupRect.height - gutter));
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  popup.style.visibility = "visible";
};

const openMapPopup = (record, type, button) => {
  const popup = document.getElementById("map-popup");
  if (!popup) return;

  closeMapPopup();
  activeMapButton = button;
  button.classList.add("is-active");
  button.setAttribute("aria-expanded", "true");
  popup.className = `map-popup map-popup-${type}`;

  const close = createElement("button", "map-popup-close", "×");
  close.type = "button";
  close.setAttribute("aria-label", "Close map popup");
  close.addEventListener("click", () => closeMapPopup(true));

  const copy = createElement("div", "map-popup-copy");
  copy.appendChild(createElement("h3", "", record.name));

  if (type === "building") {
    const availability = createElement("p");
    availability.append(createElement("strong", "", "Availability: "), record.availability);
    const rent = createElement("p");
    rent.append(createElement("strong", "", "Rent: "), record.rent);
    copy.append(availability, rent);

    const image = createElement("img", "map-popup-image");
    image.src = record.image;
    image.alt = record.imageAlt;
    popup.append(copy, image, close);
  } else {
    const lines = createElement("div", "map-popup-lines");
    record.lines.forEach((line) => {
      lines.appendChild(createElement("span", `line-chip ${lineClass(line)}`, mapLineLabel(line)));
    });
    copy.appendChild(lines);
    popup.append(copy, close);
  }

  popup.hidden = false;
  popup.style.visibility = "hidden";
  requestAnimationFrame(() => positionMapPopup(button));
};

const renderInteractiveMap = (buildings, stations) => {
  const map = document.getElementById("interactive-map");
  const markers = document.getElementById("map-markers");
  if (!map || !markers) return;

  const addMarker = (record, type) => {
    const button = createElement("button", `map-marker map-marker-${type}`);
    button.type = "button";
    button.style.left = `${record.x}%`;
    button.style.top = `${record.y}%`;
    button.setAttribute("aria-label", `Open details for ${record.name}`);
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");

    if (type === "building") {
      const construction = record.status.toLowerCase().includes("construction");
      button.classList.add(construction ? "map-marker-construction" : "map-marker-available");
      button.title = `${record.name} — ${record.status}`;
    } else {
      button.appendChild(createElement("span", "station-roundel"));
      button.title = record.name;
    }

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (activeMapButton === button) {
        closeMapPopup(true);
      } else {
        openMapPopup(record, type, button);
      }
    });
    markers.appendChild(button);
  };

  buildings.forEach((building) => addMarker(building, "building"));
  stations.forEach((station) => addMarker(station, "station"));
  map.addEventListener("click", (event) => {
    if (!event.target.closest(".map-marker, .map-popup")) closeMapPopup();
  });
  map.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMapPopup(true);
  });
  window.addEventListener("resize", () => {
    if (activeMapButton) positionMapPopup(activeMapButton);
  });
};

const renderOverview = (data) => {
  const copy = document.getElementById("overview-copy");
  data.overview.forEach((paragraph) => copy.appendChild(createElement("p", "", paragraph)));

  document.getElementById("development-count").textContent = data.developments.tracked;

  const status = document.getElementById("development-status");
  const available = createElement("span", "status-chip status-available");
  available.append(createElement("i", "status-dot"), `${data.developments.available} available`);
  const construction = createElement("span", "status-chip status-construction");
  construction.append(createElement("i", "status-dot"), `${data.developments.underConstruction} under construction / pre-let`);
  status.append(available, construction);

  const list = document.getElementById("building-list");
  data.developments.buildings.forEach((building) => {
    const item = createElement("li");
    item.append(
      createElement("strong", "", building.name),
      createElement("span", "", building.status),
    );
    list.appendChild(item);
  });

  renderInteractiveMap(data.developments.buildings, data.stations);
};

const renderScores = (scores) => {
  const grid = document.getElementById("score-grid");
  scores.forEach((score) => {
    const card = createElement("article", `score-card score-${score.key}`);
    const heading = createElement("h3", "", score.label);
    const gauge = createElement("div", "score-gauge");
    gauge.style.setProperty("--score", 0);
    gauge.dataset.scoreTarget = String(score.score);
    gauge.setAttribute("role", "img");
    gauge.setAttribute("aria-label", `${score.label}: ${score.score} out of 100`);

    const arc = createElement("div", "gauge-arc");
    const needle = createElement("span", "gauge-needle");
    const hub = createElement("span", "gauge-hub");
    const number = createElement("strong", "gauge-number");
    configureCounter(number, { target: score.score, label: `${score.score} out of 100` });
    const scale = createElement("div", "gauge-scale");
    scale.append(createElement("span", "", "0"), createElement("span", "", "100"));
    gauge.append(arc, needle, hub, number, scale);

    const metric = createElement("div", "score-metric");
    const metricValue = createElement("strong");
    configureCounter(metricValue, {
      target: score.metricTarget,
      decimals: score.metricDecimals,
      suffix: score.metricSuffix,
      label: score.metricValue,
    });
    metric.append(
      metricValue,
      createElement("span", "", score.metricLabel),
    );

    card.append(heading, gauge, metric);
    grid.appendChild(card);
  });
};

const renderOccupiers = (data) => {
  const bars = document.getElementById("sector-bars");
  data.occupierComposition.forEach((sector) => {
    const row = createElement("div", "sector-row");
    const label = createElement("div", "sector-label");
    label.append(
      createElement("span", "", sector.sector),
      createElement("strong", "", `${sector.share.toFixed(1)}%`),
    );
    const track = createElement("div", "sector-track");
    const fill = createElement("span", "sector-fill");
    fill.style.width = `${Math.min(100, (sector.share / 25) * 100)}%`;
    track.appendChild(fill);
    row.append(label, track);
    bars.appendChild(row);
  });
  const scale = createElement("div", "bar-scale");
  scale.append(createElement("span", "", "0"), createElement("span", "", "25% of occupied floorspace"));
  bars.appendChild(scale);

  const occupiers = document.getElementById("occupier-list");
  data.notableOccupiers.forEach((occupier) => {
    const item = createElement("div", "occupier-item");
    const mark = createElement("span", "occupier-mark", getInitials(occupier.name));
    const copy = createElement("div", "occupier-copy");
    copy.append(
      createElement("strong", "", occupier.name),
      createElement("span", "", occupier.building),
      createElement("small", "", `${formatSqFt(occupier.floorSpace)} sq ft`),
    );
    item.append(mark, copy);
    occupiers.appendChild(item);
  });
};

const renderMarket = (marketStats) => {
  const container = document.getElementById("market-stats");
  marketStats.forEach((stat) => {
    const item = createElement("div", "market-stat");
    item.append(
      createElement("span", "market-stat-label", stat.label),
      createElement("strong", "market-stat-value", stat.value),
      createElement("small", "", stat.note),
    );
    container.appendChild(item);
  });
};

const renderStations = (stations) => {
  const container = document.getElementById("station-list");
  stations.forEach((station) => {
    const item = createElement("div", "station-item");
    item.appendChild(createElement("h3", "", station.name));
    const lines = createElement("div", "line-list");
    lines.setAttribute("aria-label", `${station.name} lines`);
    station.lines.forEach((line) => {
      lines.appendChild(createElement("span", `line-chip ${lineClass(line)}`, line));
    });
    item.appendChild(lines);
    container.appendChild(item);
  });
};

const initialise = async () => {
  try {
    const response = await fetch(dataUrl);
    if (!response.ok) throw new Error(`Data request failed: ${response.status}`);
    const data = await response.json();

    renderHero(data);
    renderOverview(data);
    renderScores(data.scores);
    renderOccupiers(data);
    renderMarket(data.marketStats);
    renderStations(data.stations);
    initialiseInViewAnimations();
    document.getElementById("source-note").textContent = `Sources: ${data.sources}`;
    document.getElementById("main-content").setAttribute("aria-busy", "false");
    document.documentElement.classList.add("data-ready");
  } catch (error) {
    document.getElementById("main-content").setAttribute("aria-busy", "false");
    document.getElementById("data-error").hidden = false;
    console.error(error);
  }
};

initialise();
