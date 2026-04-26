const query = `
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

fetch("https://gql.twitch.tv/gql", {
  method: "POST",
  headers: {
    "Client-ID": "kimne78kx3ncx6brgo4mv6wki5h1ko", // replace this
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ query, variables: { login: "feelssunnyman" } })
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));