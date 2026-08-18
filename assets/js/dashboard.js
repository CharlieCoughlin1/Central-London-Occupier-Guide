const dataUrl = new URL("../../data/submarkets/noho-fitzrovia.json", import.meta.url);

const createElement = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

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
let activeMapPopup = null;
let districtMap = null;

const closeMapPopup = (returnFocus = false) => {
  const button = activeMapButton;
  const popup = activeMapPopup;
  activeMapButton = null;
  activeMapPopup = null;
  if (popup) popup.remove();
  if (button) {
    button.setAttribute("aria-expanded", "false");
    button.classList.remove("is-active");
    if (returnFocus) button.focus();
  }
};

const buildMapPopup = (record, type) => {
  const popup = createElement("article", `location-popup location-popup-${type}`);
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-label", `${record.name} details`);

  const close = createElement("button", "location-popup-close", "×");
  close.type = "button";
  close.setAttribute("aria-label", "Close map popup");
  close.addEventListener("click", () => closeMapPopup(true));

  if (type === "building") {
    const image = createElement("img", "location-popup-image");
    image.src = record.image;
    image.alt = record.imageAlt;

    const body = createElement("div", "location-popup-body");
    const status = createElement("span", "location-popup-status", record.status);
    if (record.status.toLowerCase().includes("construction")) status.classList.add("is-construction");
    body.append(status, createElement("h3", "", record.name), createElement("p", "location-popup-address", record.address));

    const facts = createElement("dl", "location-popup-facts");
    const addFact = (label, value) => {
      const item = createElement("div");
      item.append(createElement("dt", "", label), createElement("dd", "", value));
      facts.appendChild(item);
    };
    addFact("Availability", record.availability);
    addFact("Rent", record.rent);
    body.appendChild(facts);
    popup.append(image, body, close);
  } else {
    const body = createElement("div", "location-popup-body");
    body.append(createElement("span", "location-popup-kicker", "Tube & rail"), createElement("h3", "", record.name));
    const lines = createElement("div", "map-popup-lines");
    record.lines.forEach((line) => {
      lines.appendChild(createElement("span", `line-chip ${lineClass(line)}`, mapLineLabel(line)));
    });
    body.appendChild(lines);
    popup.append(body, close);
  }

  return popup;
};

const openMapPopup = (record, type, button) => {
  closeMapPopup();
  activeMapButton = button;
  button.classList.add("is-active");
  button.setAttribute("aria-expanded", "true");

  activeMapPopup = new window.maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    focusAfterOpen: false,
    anchor: "bottom",
    maxWidth: "390px",
    offset: type === "building" ? 20 : 24,
    className: `district-map-popup district-map-popup-${type}`,
  })
    .setLngLat(record.coordinates)
    .setDOMContent(buildMapPopup(record, type))
    .addTo(districtMap);
};

const renderInteractiveMap = (data) => {
  const mapContainer = document.getElementById("live-map");
  const mapShell = document.getElementById("interactive-map");
  if (!mapContainer || !mapShell || !window.maplibregl) return;

  districtMap = new window.maplibregl.Map({
    container: mapContainer,
    style: "https://tiles.openfreemap.org/styles/positron",
    bounds: data.mapBounds,
    fitBoundsOptions: { padding: 24, duration: 0 },
    maxBounds: data.mapMaxBounds,
    minZoom: 13.8,
    maxZoom: 18.5,
    attributionControl: true,
  });
  districtMap.scrollZoom.disable();
  districtMap.dragRotate.disable();
  districtMap.touchZoomRotate.disableRotation();
  districtMap.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), "top-right");

  const addMarker = (record, type) => {
    const shell = createElement("div", "map-marker-shell");
    const button = createElement("button", `map-marker map-marker-${type}`);
    button.type = "button";
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
      if (activeMapButton === button) closeMapPopup(true);
      else openMapPopup(record, type, button);
    });
    shell.appendChild(button);
    new window.maplibregl.Marker({ element: shell, anchor: "center" })
      .setLngLat(record.coordinates)
      .addTo(districtMap);
  };

  data.developments.buildings.forEach((building) => addMarker(building, "building"));
  data.stations.forEach((station) => addMarker(station, "station"));
  districtMap.on("load", () => mapShell.classList.add("map-ready"));
  districtMap.on("click", () => closeMapPopup());
  mapShell.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMapPopup(true);
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

  renderInteractiveMap(data);
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
    const mark = createElement("span", "occupier-mark");
    const logo = createElement("img", "occupier-logo");
    logo.src = occupier.logo;
    logo.alt = occupier.logoAlt;
    mark.appendChild(logo);
    const copy = createElement("div", "occupier-copy");
    copy.appendChild(createElement("strong", "", occupier.name));
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
