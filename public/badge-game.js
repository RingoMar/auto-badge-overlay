(function () {
  const STREAM_DATABASE_EVENTS_URL = "/events";
  const TWITCH_GQL_URL = "/twitch-gql";
  const STREAMER_LOGIN = "feelssunnyman";
  const CHECK_INTERVAL_MS = 120_000;
  const BLANK_BADGE_SRC = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

  const TWITCH_GAME_QUERY = `
query($login: String!) {
  user(login: $login) {
    id

    stream {
      id
      viewersCount
      game {
        displayName
      }
    }

    broadcastSettings {
      game {
        displayName
      }
    }
  }
}
`;

  const badgeImage = document.querySelector(".image-wrap img");
  let badgeUrlByGame = new Map();
  let activeBadgeUrl = null;

  function normalizeGameName(value) {
    return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  function getEventsFromPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload && payload.data)) return payload.data;
    if (Array.isArray(payload && payload.events)) return payload.events;
    return [];
  }

  function parseBadgeImageUrl(content) {
    const match = String(content || "").match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/i);
    return match ? match[1] : "";
  }

  function parseCategoryNames(content) {
    const match = String(content || "").match(/following categor(?:y|ies):\s*([^\r\n]+)/i);
    if (!match) return [];

    return match[1]
      .split(",")
      .map((category) => category.trim())
      .filter(Boolean);
  }

  function buildBadgeMap(payload) {
    const map = new Map();

    for (const event of getEventsFromPayload(payload)) {
      if (!event || event.hidden === true) continue;

      const badgeUrl = parseBadgeImageUrl(event.content);
      const categoryNames = parseCategoryNames(event.content);
      if (!badgeUrl || categoryNames.length === 0) continue;

      for (const categoryName of categoryNames) {
        const gameKey = normalizeGameName(categoryName);
        if (gameKey && !map.has(gameKey)) {
          map.set(gameKey, badgeUrl);
        }
      }
    }

    return map;
  }

  function setBadgeImage(badgeUrl) {
    const nextBadgeUrl = badgeUrl || "";
    if (!badgeImage || activeBadgeUrl === nextBadgeUrl) return;

    activeBadgeUrl = nextBadgeUrl;

    if (nextBadgeUrl) {
      badgeImage.src = nextBadgeUrl;
      badgeImage.style.visibility = "";
      return;
    }

    badgeImage.src = BLANK_BADGE_SRC;
    badgeImage.style.visibility = "hidden";
  }

  async function loadStreamDatabaseBadges() {
    const response = await fetch(STREAM_DATABASE_EVENTS_URL);
    if (!response.ok) {
      throw new Error(`StreamDatabase request failed: ${response.status}`);
    }

    const payload = await response.json();
    badgeUrlByGame = buildBadgeMap(payload);
  }

  async function fetchCurrentTwitchGame() {
    const response = await fetch(TWITCH_GQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: TWITCH_GAME_QUERY,
        variables: { login: STREAMER_LOGIN }
      })
    });

    if (!response.ok) {
      throw new Error(`Twitch GQL request failed: ${response.status}`);
    }

    const payload = await response.json();
    const user = payload && payload.data && payload.data.user;
    return (
      user &&
      (
        user.stream &&
        user.stream.game &&
        user.stream.game.displayName
      )
    ) || (
      user &&
      user.broadcastSettings &&
      user.broadcastSettings.game &&
      user.broadcastSettings.game.displayName
    ) || "";
  }

  async function updateBadgeForCurrentGame() {
    try {
      const gameName = await fetchCurrentTwitchGame();
      const badgeUrl = badgeUrlByGame.get(normalizeGameName(gameName));
      setBadgeImage(badgeUrl);
    } catch (error) {
      console.error(error);
      setBadgeImage("");
    }
  }

  async function initBadgeGameSwitcher() {
    setBadgeImage("");

    try {
      await loadStreamDatabaseBadges();
    } catch (error) {
      console.error(error);
    }

    updateBadgeForCurrentGame();
    setInterval(updateBadgeForCurrentGame, CHECK_INTERVAL_MS);
  }

  initBadgeGameSwitcher();
}());
