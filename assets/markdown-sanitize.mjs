export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&#39;");
}

export function sanitizeLinkHref(href) {
  const raw = String(href ?? "").trim();
  if (!raw) return null;

  // Disallow protocol-relative URLs (e.g. //evil.com) and Windows UNC-like paths
  if (raw.startsWith("//") || raw.startsWith("\\\\")) return null;

  const lower = raw.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return null;
  }

  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:") ||
    raw.startsWith("#") ||
    raw.startsWith("/") ||
    raw.startsWith("./") ||
    raw.startsWith("../")
  ) {
    return raw;
  }

  return null;
}

export function sanitizeImageSrc(src) {
  const raw = String(src ?? "").trim();
  if (!raw) return null;

  // Disallow protocol-relative URLs (e.g. //evil.com) and Windows UNC-like paths
  if (raw.startsWith("//") || raw.startsWith("\\\\")) return null;

  const lower = raw.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return null;
  }

  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    raw.startsWith("/") ||
    raw.startsWith("./") ||
    raw.startsWith("../")
  ) {
    return raw;
  }

  return null;
}

export function sanitizeHtmlFragment(html) {
  const ALLOWED_TAGS = new Set([
    "a",
    "abbr",
    "b",
    "blockquote",
    "br",
    "code",
    "del",
    "details",
    "div",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "kbd",
    "li",
    "mark",
    "ol",
    "p",
    "pre",
    "s",
    "small",
    "span",
    "strong",
    "sub",
    "sup",
    "summary",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "u",
    "ul",
  ]);

  const DROP_TAGS = new Set([
    "base",
    "canvas",
    "embed",
    "form",
    "iframe",
    "input",
    "link",
    "meta",
    "object",
    "option",
    "script",
    "select",
    "style",
    "textarea",
    "video",
    "audio",
    "source",
    "svg",
    "math",
  ]);

  const isSafeAlign = (value) => {
    const v = String(value ?? "").trim().toLowerCase();
    return v === "left" || v === "right" || v === "center" || v === "justify";
  };

  const isPositiveInt = (value) => /^\d+$/.test(String(value ?? "").trim());

  const sanitizeChildren = (root) => {
    let child = root.firstChild;
    while (child) {
      const next = child.nextSibling;
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        sanitizeElement(child);
      }
      child = next;
    }
  };

  const sanitizeElement = (el) => {
    const tag = String(el.tagName || "").toLowerCase();

    if (DROP_TAGS.has(tag)) {
      el.remove();
      return;
    }

    if (!ALLOWED_TAGS.has(tag)) {
      sanitizeChildren(el);
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        el.remove();
      }
      return;
    }

    for (const attr of Array.from(el.attributes || [])) {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      if (name.startsWith("on") || name === "style" || name === "srcset") {
        el.removeAttribute(attr.name);
        continue;
      }

      if (name === "class" || name === "id" || name === "title") continue;
      if (name === "align" && isSafeAlign(value)) continue;

      if (tag === "details" && name === "open") continue;

      if (tag === "a") {
        if (name === "href") {
          const safeHref = sanitizeLinkHref(value);
          if (safeHref) el.setAttribute("href", safeHref);
          else el.removeAttribute("href");
          continue;
        }
        if (name === "target") {
          const t = String(value ?? "").trim();
          if (t === "_blank") el.setAttribute("target", "_blank");
          else el.removeAttribute("target");
          continue;
        }
        if (name === "rel") continue;

        el.removeAttribute(attr.name);
        continue;
      }

      if (tag === "img") {
        if (name === "src") {
          const safeSrc = sanitizeImageSrc(value);
          if (safeSrc) el.setAttribute("src", safeSrc);
          else {
            el.remove();
            return;
          }
          continue;
        }
        if (name === "alt") continue;
        if ((name === "width" || name === "height") && isPositiveInt(value)) continue;

        el.removeAttribute(attr.name);
        continue;
      }

      if (
        (tag === "td" || tag === "th") &&
        (name === "colspan" || name === "rowspan") &&
        isPositiveInt(value)
      ) {
        continue;
      }

      el.removeAttribute(attr.name);
    }

    if (tag === "a" && el.getAttribute("target") === "_blank") {
      const rel = String(el.getAttribute("rel") || "").toLowerCase();
      const parts = new Set(rel.split(/\s+/).filter(Boolean));
      parts.add("noopener");
      parts.add("noreferrer");
      el.setAttribute("rel", Array.from(parts).join(" "));
    }

    sanitizeChildren(el);
  };

  const template = document.createElement("template");
  template.innerHTML = String(html ?? "");
  sanitizeChildren(template.content);
  return template.innerHTML;
}
