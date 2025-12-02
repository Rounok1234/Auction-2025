document.addEventListener("DOMContentLoaded", () => {

  let players = [];
  let teams = [];
  let currentIndex = 0;
  let unsoldList = [];
  const savedData = JSON.parse(localStorage.getItem("auctionData")) || {};

  let teamBudget = {};

  const card = document.getElementById("player-card");
  const resultBox = document.getElementById("action-result");
  const unsoldCount = document.getElementById("unsold-count");
  const roundNumberEl = document.getElementById("round-number");
  const teamsGrid = document.querySelector(".teams-grid");

  Promise.all([
    fetch("teams.json").then(r => r.json()),
    fetch("players.json").then(r => r.json())
  ])
  .then(([teamsData, playersData]) => {
    teams = teamsData;
    players = playersData;

    teams.forEach(t => teamBudget[t.name] = 150000);

    renderTeams(teams);
    loadPlayer(currentIndex);
  });

  function renderTeams(list) {
    teamsGrid.innerHTML = "";
    list.forEach(t => {
      const card = document.createElement("div");
      card.className = "team-card";
      card.innerHTML = `
        <div class="team-img-box">
          <img src="${t.img}" alt="${t.name}">
        </div>
        <h3>${t.name}</h3>
        <p class="budget">Budget: ${teamBudget[t.name]} Point</p>
      `;
      teamsGrid.appendChild(card);
    });
  }

  function updateTeamBalance(team) {
    document.querySelectorAll(".team-card").forEach(c => {
      const name = c.querySelector("h3").textContent.trim();
      if (name === team) {
        c.querySelector(".budget").textContent = `Budget: ${teamBudget[team]} Point`;
      }
    });
  }

  function loadPlayer(index) {
    const p = players[index];
    if (!p) {
      resultBox.textContent = "✅ Auction Completed!";
      return;
    }

    card.innerHTML = `
      <div class="player-media">
        <img src="${p.img}" alt="Player photo">
      </div>
      <div class="player-info">
        <h3>${p.name}</h3>
        <p class="muted">Batch ${p.batch} | ${p.role}</p>
      </div>
      <div class="action-controls">
        <input type="number" placeholder="Sold Price (Point)" id="sold-price" class="price-input">
        <select id="team-select" class="team-select">
          <option value="">Select Team</option>
          ${teams.map(t => `<option>${t.name}</option>`).join("")}
        </select>
        <button id="btn-sold" class="btn btn-sold">Sold</button>
        <button id="btn-unsold" class="btn btn-unsold">Unsold</button>
        <button id="btn-next" class="btn btn-next">Next Player</button>
      </div>
    `;

    const saved = savedData[p.name];
    if (saved) {
      document.getElementById("sold-price").value = saved.price;
      document.getElementById("team-select").value = saved.team;
      resultBox.textContent = `Saved: ${saved.price} Point – ${saved.team}`;
      resultBox.style.color = "#7efaff";
    } else {
      resultBox.textContent = "";
    }

    document.getElementById("btn-sold").onclick = () => markSold(p);
    document.getElementById("btn-unsold").onclick = () => markUnsold(p);
    document.getElementById("btn-next").onclick = nextPlayer;
  }

  function markSold(player) {
    const price = parseInt(document.getElementById("sold-price").value.trim());
    const team = document.getElementById("team-select").value.trim();

    if (!price || !team) {
      resultBox.textContent = "❗ Price & Team Both Required";
      resultBox.style.color = "#ff4d4d";
      return;
    }

    if (teamBudget[team] < price) {
      resultBox.textContent = "Budget Over!";
      resultBox.style.color = "#ff4d4d";
      return;
    }

    teamBudget[team] -= price;
    updateTeamBalance(team);

    savedData[player.name] = { price, team, image: player.img };
    localStorage.setItem("auctionData", JSON.stringify(savedData));

    resultBox.textContent = `✔ ${player.name} SOLD: ${price} Point – ${team}`;
    resultBox.style.color = "#7efaff";

    nextPlayer();
  }

  function markUnsold(player) {
    unsoldList.push(player);
    unsoldCount.textContent = unsoldList.length;
    resultBox.textContent = `✖ ${player.name} UNSOLD`;
    resultBox.style.color = "#ffdc73";
    nextPlayer();
  }

  function nextPlayer() {
    currentIndex++;
    if (currentIndex < players.length) {
      loadPlayer(currentIndex);
    } else {
      if (unsoldList.length > 0) {
        players = [...unsoldList];
        unsoldList = [];
        unsoldCount.textContent = "0";
        currentIndex = 0;
        roundNumberEl.textContent = "2";
        loadPlayer(currentIndex);
      } else {
        resultBox.textContent = "✅ Auction Completed!";
      }
    }
  }

  document.addEventListener("click", (e) => {
    const cardEl = e.target.closest(".team-card");
    if (!cardEl) return;

    const teamName = cardEl.querySelector("h3").textContent.trim();
    const modal = document.getElementById("teamModal");
    const title = document.getElementById("teamModalTitle");
    const listBox = document.getElementById("teamPlayersList");
    const budgetEl = document.getElementById("teamModalBalance");

    title.textContent = `Players Bought by ${teamName}`;
    budgetEl.textContent = `Budget: ${teamBudget[teamName]} Point`;
    listBox.innerHTML = "";

    const boughtPlayers = Object.entries(savedData)
      .filter(([_, info]) => info.team === teamName);

    if (boughtPlayers.length === 0) {
      listBox.innerHTML = "<p>No players bought yet.</p>";
    } else {
      boughtPlayers.forEach(([playerName, info], index) => {
        const fullPlayer = players.find(p => p.name === playerName);

        const div = document.createElement("div");
        div.className = "team-player-item";

        div.innerHTML = `
          <div class="team-player-img-box"><img src="${info.image}" /></div>
          <div class="team-player-info">
            <strong>${index + 1}. ${playerName}</strong> <br>
            Batch: ${fullPlayer.batch} <br>
            Role: ${fullPlayer.role} <br>
            <span>${info.price} Point</span>
          </div>
        `;

        listBox.appendChild(div);
      });
    }

    const pdfBtn = document.getElementById("downloadTeamPDF");

    pdfBtn.onclick = () => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text(`Team: ${teamName}`, 10, 10);
      doc.text(`Budget: ${teamBudget[teamName]} Point`, 10, 20);

      doc.setFontSize(12);
      doc.text("Players:", 10, 35);

      let y = 45;
      boughtPlayers.forEach(([playerName, info], index) => {
        const fullPlayer = players.find(p => p.name === playerName);

        doc.text(
          `${index + 1}. ${playerName} (Batch: ${fullPlayer.batch}, Role: ${fullPlayer.role}) – ${info.price} Point`,
          10, 
          y
        );
        y += 10;
      });

      doc.save(`${teamName}_players.pdf`);

      Object.keys(savedData).forEach(p => {
        if (savedData[p].team === teamName) delete savedData[p];
      });
      localStorage.setItem("auctionData", JSON.stringify(savedData));

      modal.style.display = "none";
      renderTeams(teams);
    };

    modal.style.display = "flex";
  });

  document.getElementById("closeTeamModal").onclick = () => {
    document.getElementById("teamModal").style.display = "none";
  };

  window.addEventListener("click", (e) => {
    if (e.target.id === "teamModal") {
      document.getElementById("teamModal").style.display = "none";
    }
  });

});



