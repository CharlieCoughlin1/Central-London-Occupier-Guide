const PAGE_WIDTH = 1191;
const PAGE_HEIGHT = 842;
const CANVAS_SCALE = 3;

const colours = {
  brand: "#cc2030",
  brandDark: "#9f1f34",
  graphite: "#3d3834",
  graphiteDeep: "#292725",
  ink: "#161a21",
  muted: "#666a70",
  paper: "#f3f1ee",
  surface: "#ffffff",
  line: "#dedbd7",
  blue: "#006786",
  cyan: "#4daeb0",
  logoBackground: "#f2f2f2",
};

const scoreColours = {
  connectivity: colours.blue,
  amenity: colours.brand,
  culture: colours.cyan,
};

const lineColours = {
  Central: "#e32017",
  Northern: "#111111",
  Elizabeth: "#6950a1",
  Victoria: "#0098d4",
  Circle: "#d8b400",
  "Hammersmith & City": "#d68ba1",
  Metropolitan: "#9b0056",
  Bakerloo: "#b36305",
};

const normalisePdfText = (value) => String(value ?? "")
  .replace(/[–—−]/g, "-")
  .replace(/★/g, "star")
  .replace(/\s+/g, " ")
  .trim();

const roundedRect = (context, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
};

const fillCard = (context, x, y, width, height, fill = colours.surface, border = colours.line, radius = 12) => {
  roundedRect(context, x, y, width, height, radius);
  context.fillStyle = fill;
  context.fill();
  if (border) {
    context.strokeStyle = border;
    context.lineWidth = 0.8;
    context.stroke();
  }
};

const setFont = (context, size, weight = 400, colour = colours.ink) => {
  context.font = `${weight} ${size}px "DIN Pro", "DINPro", Arial, sans-serif`;
  context.fillStyle = colour;
  context.textBaseline = "alphabetic";
};

const splitLines = (context, text, maxWidth) => {
  const words = normalisePdfText(text).split(" ");
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines;
};

const drawWrappedText = (context, text, x, y, maxWidth, lineHeight, maxLines = Infinity) => {
  const lines = splitLines(context, text, maxWidth);
  const visible = lines.slice(0, maxLines);
  visible.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  return y + visible.length * lineHeight;
};

const drawSectionHeading = (context, title, x, y, titleColour = colours.graphiteDeep) => {
  context.fillStyle = colours.brand;
  context.fillRect(x, y, 23, 3);
  setFont(context, 11.5, 700, titleColour);
  context.fillText(title.toUpperCase(), x + 31, y + 5);
};

const loadImage = (source) => new Promise((resolve) => {
  const image = new Image();
  image.decoding = "async";
  image.onload = () => resolve(image);
  image.onerror = () => resolve(null);
  image.src = new URL(source, document.baseURI).href;
});

const drawImageCover = (context, image, x, y, width, height, radius = 6) => {
  if (!image) return;
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;
  context.save();
  roundedRect(context, x, y, width, height, radius);
  context.clip();
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  context.restore();
};

const drawImageContain = (context, image, x, y, width, height) => {
  if (!image) return;
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
};

const drawOverview = (context, data, x, y, width, height) => {
  fillCard(context, x, y, width, height);
  drawSectionHeading(context, "District overview", x + 15, y + 18);
  let cursor = y + 47;
  setFont(context, 8.25, 400, "#44484d");
  data.overview.forEach((paragraph, index) => {
    cursor = drawWrappedText(context, paragraph, x + 15, cursor, width - 30, 10.5);
    if (index < data.overview.length - 1) cursor += 8;
  });
};

const drawScores = (context, data, x, y, width, height) => {
  fillCard(context, x, y, width, height, colours.graphite, null);
  drawSectionHeading(context, "Location scores", x + 15, y + 18, "#ffffff");
  const gap = 8;
  const cardWidth = (width - 30 - gap * 2) / 3;
  data.scores.forEach((score, index) => {
    const cardX = x + 15 + index * (cardWidth + gap);
    const cardY = y + 37;
    fillCard(context, cardX, cardY, cardWidth, height - 51, colours.surface, null, 9);
    setFont(context, 6.8, 700, scoreColours[score.key]);
    context.textAlign = "center";
    context.fillText(score.label.toUpperCase(), cardX + cardWidth / 2, cardY + 13);
    context.fillStyle = scoreColours[score.key];
    context.beginPath();
    context.arc(cardX + cardWidth / 2, cardY + 38, 16, 0, Math.PI * 2);
    context.fill();
    setFont(context, 14.5, 700, "#ffffff");
    context.fillText(String(score.score), cardX + cardWidth / 2, cardY + 43);
    setFont(context, 11.5, 700, scoreColours[score.key]);
    context.fillText(score.metricValue, cardX + cardWidth / 2, cardY + 68);
    setFont(context, 6.7, 400, colours.muted);
    const metricLines = splitLines(context, score.metricLabel, cardWidth - 12).slice(0, 2);
    metricLines.forEach((line, lineIndex) => context.fillText(line, cardX + cardWidth / 2, cardY + 80 + lineIndex * 8));
  });
  context.textAlign = "left";
};

const drawMethodology = (context, x, y, width, height) => {
  fillCard(context, x, y, width, height);
  drawSectionHeading(context, "How the scores are calculated", x + 15, y + 18);
  const groups = [
    {
      title: "Connectivity",
      intro: "Measures public transport accessibility within the submarket:",
      bullets: [
        "People reachable within 50 minutes by public transport from the main station",
        "Number of rail/Underground stations",
        "Average PTAL score",
      ],
    },
    {
      title: "Amenity",
      intro: "Captures depth of everyday amenities:",
      bullets: ["Total 4-5 star hotel rooms", "Number of gyms", "Total Food & Beverage outlets", "Total garden-square acreage"],
    },
    {
      title: "Culture",
      intro: "Reflects cultural vibrancy:",
      bullets: ["Number of major attractions", "Number of theatres", "Number of nightclubs", "Number of pubs"],
    },
  ];

  let cursor = y + 44;
  groups.forEach((group, groupIndex) => {
    setFont(context, 8.1, 700, [colours.blue, colours.brand, colours.cyan][groupIndex]);
    context.fillText(group.title.toUpperCase(), x + 15, cursor);
    cursor += 10;
    setFont(context, 6.8, 400, colours.muted);
    cursor = drawWrappedText(context, group.intro, x + 15, cursor, width - 30, 8.2) + 2;
    group.bullets.forEach((bullet) => {
      context.fillStyle = colours.brand;
      context.beginPath();
      context.arc(x + 18, cursor - 2.2, 1.5, 0, Math.PI * 2);
      context.fill();
      setFont(context, 6.9, 400, colours.ink);
      cursor = drawWrappedText(context, bullet, x + 24, cursor, width - 39, 8.2);
    });
    if (groupIndex < groups.length - 1) cursor += 7;
  });
};

const drawDevelopments = (context, data, images, x, y, width, height) => {
  fillCard(context, x, y, width, height);
  drawSectionHeading(context, "Key office developments", x + 15, y + 18);
  setFont(context, 6.8, 400, colours.muted);
  context.fillText(`${data.developments.available} available  |  ${data.developments.underConstruction} under construction / pre-let`, x + 15, y + 35);
  const rowTop = y + 46;
  const rowHeight = (height - 57) / data.developments.buildings.length;

  data.developments.buildings.forEach((building, index) => {
    const rowY = rowTop + index * rowHeight;
    if (index) {
      context.strokeStyle = colours.line;
      context.lineWidth = 0.7;
      context.beginPath();
      context.moveTo(x + 15, rowY);
      context.lineTo(x + width - 15, rowY);
      context.stroke();
    }
    const imageY = rowY + 7;
    drawImageCover(context, images[index], x + 15, imageY, 54, rowHeight - 14, 5);
    const textX = x + 79;
    setFont(context, 8.7, 700, colours.graphiteDeep);
    context.fillText(normalisePdfText(building.name).toUpperCase(), textX, rowY + 17);
    const isConstruction = building.status.toLowerCase().includes("construction");
    setFont(context, 6.3, 700, isConstruction ? colours.cyan : colours.brand);
    context.fillText(normalisePdfText(building.status).toUpperCase(), textX, rowY + 28);
    setFont(context, 6.6, 400, colours.muted);
    context.fillText(normalisePdfText(building.address), textX, rowY + 39);
    setFont(context, 6.5, 700, colours.ink);
    context.fillText(`Availability: ${normalisePdfText(building.availability)}`, textX, rowY + 50);
    context.fillText(`Rent: ${normalisePdfText(building.rent)}`, textX + 154, rowY + 50);
  });
};

const drawStations = (context, stations, x, y, width, height) => {
  fillCard(context, x, y, width, height);
  drawSectionHeading(context, "Tube & rail", x + 15, y + 18);
  const rowHeight = (height - 39) / stations.length;
  stations.forEach((station, index) => {
    const rowY = y + 36 + index * rowHeight;
    setFont(context, 7.7, 700, colours.graphiteDeep);
    context.fillText(station.name.toUpperCase(), x + 15, rowY + 9);
    let chipX = x + 166;
    station.lines.forEach((line) => {
      setFont(context, 5.8, 700, "#ffffff");
      const label = line === "Hammersmith & City" ? "H&C" : line;
      const chipWidth = context.measureText(label).width + 10;
      fillCard(context, chipX, rowY, chipWidth, 14, lineColours[line] || colours.muted, null, 7);
      context.textAlign = "center";
      context.fillText(label, chipX + chipWidth / 2, rowY + 9.5);
      context.textAlign = "left";
      chipX += chipWidth + 4;
    });
  });
};

const drawComposition = (context, data, x, y, width, height) => {
  fillCard(context, x, y, width, height);
  drawSectionHeading(context, "Occupier composition", x + 15, y + 18);
  const rowY = y + 39;
  const rowHeight = 25;
  data.occupierComposition.forEach((sector, index) => {
    const currentY = rowY + index * rowHeight;
    setFont(context, 7.2, 400, colours.ink);
    context.fillText(sector.sector, x + 15, currentY + 7);
    setFont(context, 7.2, 700, colours.brand);
    context.textAlign = "right";
    context.fillText(`${sector.share.toFixed(1)}%`, x + width - 15, currentY + 7);
    context.textAlign = "left";
    context.fillStyle = "#ece9e6";
    roundedRect(context, x + 15, currentY + 12, width - 30, 6, 3);
    context.fill();
    context.fillStyle = colours.brand;
    roundedRect(context, x + 15, currentY + 12, (width - 30) * (sector.share / 25), 6, 3);
    context.fill();
  });
  setFont(context, 6, 400, colours.muted);
  context.fillText("0%", x + 15, y + height - 12);
  context.textAlign = "right";
  context.fillText("25% of occupied floorspace", x + width - 15, y + height - 12);
  context.textAlign = "left";
};

const drawOccupiers = (context, data, images, x, y, width, height) => {
  fillCard(context, x, y, width, height);
  drawSectionHeading(context, "Notable occupiers", x + 15, y + 18);
  const gap = 8;
  const cardWidth = (width - 30 - gap) / 2;
  const cardHeight = (height - 49 - gap) / 2;
  data.notableOccupiers.forEach((occupier, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const cardX = x + 15 + column * (cardWidth + gap);
    const cardY = y + 36 + row * (cardHeight + gap);
    fillCard(context, cardX, cardY, cardWidth, cardHeight, colours.logoBackground, null, 8);
    drawImageContain(context, images[index], cardX + 8, cardY + 7, 70, cardHeight - 14);
    setFont(context, 7.2, 700, colours.graphiteDeep);
    const nameLines = splitLines(context, occupier.name, cardWidth - 92).slice(0, 2);
    nameLines.forEach((line, lineIndex) => context.fillText(line, cardX + 86, cardY + cardHeight / 2 + lineIndex * 8 - (nameLines.length - 1) * 4 + 2));
  });
};

const drawMarketStats = (context, data, x, y, width, height) => {
  fillCard(context, x, y, width, height);
  drawSectionHeading(context, "Market data", x + 15, y + 18);
  setFont(context, 6.5, 700, colours.muted);
  context.textAlign = "right";
  context.fillText(data.period.toUpperCase(), x + width - 15, y + 22);
  context.textAlign = "left";
  const gap = 8;
  const cardWidth = (width - 30 - gap) / 2;
  const cardHeight = 68;
  data.marketStats.forEach((stat, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const isLast = index === data.marketStats.length - 1;
    const cardX = isLast ? x + 15 : x + 15 + column * (cardWidth + gap);
    const cardY = y + 37 + row * (cardHeight + gap);
    const currentWidth = isLast ? width - 30 : cardWidth;
    const fill = index === 0 ? colours.brand : (isLast ? colours.graphite : "#f5f2ef");
    const lightText = index === 0 || isLast;
    fillCard(context, cardX, cardY, currentWidth, cardHeight, fill, null, 9);
    setFont(context, 6.4, 700, lightText ? "rgba(255,255,255,0.76)" : colours.muted);
    context.fillText(stat.label.toUpperCase(), cardX + 10, cardY + 14);
    setFont(context, 13.2, 700, lightText ? "#ffffff" : colours.graphiteDeep);
    context.fillText(normalisePdfText(stat.value), cardX + 10, cardY + 37);
    setFont(context, 6.2, 400, lightText ? "rgba(255,255,255,0.72)" : colours.muted);
    context.fillText(normalisePdfText(stat.note), cardX + 10, cardY + 55);
  });
};

const renderPdfCanvas = async (data) => {
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_WIDTH * CANVAS_SCALE;
  canvas.height = PAGE_HEIGHT * CANVAS_SCALE;
  const context = canvas.getContext("2d", { alpha: false });
  context.scale(CANVAS_SCALE, CANVAS_SCALE);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const [developmentImages, occupierImages] = await Promise.all([
    Promise.all(data.developments.buildings.map((building) => loadImage(building.image))),
    Promise.all(data.notableOccupiers.map((occupier) => loadImage(occupier.logo))),
  ]);

  context.fillStyle = colours.paper;
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  context.fillStyle = colours.graphiteDeep;
  context.fillRect(0, 0, PAGE_WIDTH, 108);
  context.fillStyle = colours.brand;
  context.fillRect(0, 0, PAGE_WIDTH, 7);

  setFont(context, 8.5, 700, "rgba(255,255,255,0.65)");
  context.fillText("LAMBERT SMITH HAMPTON  /  CENTRAL LONDON OCCUPIER GUIDE", 28, 28);
  setFont(context, 34, 700, "#ffffff");
  context.fillText(data.title.toUpperCase(), 28, 69);
  setFont(context, 8, 400, "rgba(255,255,255,0.68)");
  context.fillText(`Office occupier profile  |  ${data.period}`, 30, 89);

  const factWidth = 157;
  const factGap = 9;
  const factsStart = PAGE_WIDTH - 28 - data.heroFacts.length * factWidth - (data.heroFacts.length - 1) * factGap;
  data.heroFacts.forEach((fact, index) => {
    const factX = factsStart + index * (factWidth + factGap);
    fillCard(context, factX, 26, factWidth, 58, "rgba(255,255,255,0.09)", "rgba(255,255,255,0.16)", 9);
    setFont(context, 6.5, 700, "rgba(255,255,255,0.58)");
    context.fillText(fact.label.toUpperCase(), factX + 12, 44);
    setFont(context, 15.5, 700, "#ffffff");
    context.fillText(normalisePdfText(fact.value), factX + 12, 69);
  });

  const margin = 24;
  const gap = 16;
  const columnWidth = (PAGE_WIDTH - margin * 2 - gap * 2) / 3;
  const columnOne = margin;
  const columnTwo = margin + columnWidth + gap;
  const columnThree = margin + (columnWidth + gap) * 2;
  const bodyTop = 124;

  drawOverview(context, data, columnOne, bodyTop, columnWidth, 267);
  drawScores(context, data, columnOne, bodyTop + 279, columnWidth, 139);
  drawMethodology(context, columnOne, bodyTop + 430, columnWidth, 252);

  drawDevelopments(context, data, developmentImages, columnTwo, bodyTop, columnWidth, 516);
  drawStations(context, data.stations, columnTwo, bodyTop + 528, columnWidth, 154);

  drawComposition(context, data, columnThree, bodyTop, columnWidth, 205);
  drawOccupiers(context, data, occupierImages, columnThree, bodyTop + 217, columnWidth, 163);
  drawMarketStats(context, data, columnThree, bodyTop + 392, columnWidth, 290);

  setFont(context, 6.2, 400, colours.muted);
  context.fillText("Source: LSH market and occupier datasets. Building availability and rents are indicative.", margin, PAGE_HEIGHT - 16);
  context.textAlign = "right";
  context.fillText("Lambert Smith Hampton  |  lsh.co.uk", PAGE_WIDTH - margin, PAGE_HEIGHT - 16);
  context.textAlign = "left";

  return canvas;
};

const canvasToJpeg = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("Could not render the PDF image."));
  }, "image/jpeg", 0.94);
});

const asciiBytes = (text) => new TextEncoder().encode(text);

const joinBytes = (parts) => {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
};

const jpegToPdf = async (jpegBlob, width, height) => {
  const jpeg = new Uint8Array(await jpegBlob.arrayBuffer());
  const content = asciiBytes(`q\n${PAGE_WIDTH} 0 0 ${PAGE_HEIGHT} 0 0 cm\n/Im0 Do\nQ\n`);
  const objects = [
    asciiBytes("<< /Type /Catalog /Pages 2 0 R >>"),
    asciiBytes("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    asciiBytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`),
    joinBytes([asciiBytes(`<< /Length ${content.length} >>\nstream\n`), content, asciiBytes("endstream")]),
    joinBytes([
      asciiBytes(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),
      jpeg,
      asciiBytes("\nendstream"),
    ]),
    asciiBytes("<< /Title (Noho / Fitzrovia - Central London Occupier Guide) /Author (Lambert Smith Hampton) /Creator (Central London Occupier Guide) >>"),
  ];

  const header = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 255, 255, 255, 255, 10]);
  const parts = [header];
  const offsets = [0];
  let currentOffset = header.length;
  objects.forEach((object, index) => {
    const prefix = asciiBytes(`${index + 1} 0 obj\n`);
    const suffix = asciiBytes("\nendobj\n");
    offsets.push(currentOffset);
    parts.push(prefix, object, suffix);
    currentOffset += prefix.length + object.length + suffix.length;
  });

  const xrefOffset = currentOffset;
  const xref = ["xref", `0 ${objects.length + 1}`, "0000000000 65535 f "];
  offsets.slice(1).forEach((offset) => xref.push(`${String(offset).padStart(10, "0")} 00000 n `));
  const trailer = `${xref.join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  parts.push(asciiBytes(trailer));
  return new Blob([joinBytes(parts)], { type: "application/pdf" });
};

export const downloadDashboardPdf = async (data) => {
  const canvas = await renderPdfCanvas(data);
  const jpeg = await canvasToJpeg(canvas);
  const pdf = await jpegToPdf(jpeg, canvas.width, canvas.height);
  const downloadUrl = URL.createObjectURL(pdf);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = "LSH-Noho-Fitzrovia-Occupier-Guide.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500);
};

