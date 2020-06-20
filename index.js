if (Number(process.version.slice(1).split(".")[0]) < 8)
  throw new Error(
    "Node 8.0.0 or higher is required. Update Node on your system."
  );

const { Client } = require("discord.js");

const cron = require("node-cron");

const Query = require("mcquery");

const fs = require("fs");

require("dotenv").config();

var HOST = process.env.MC_SERVER || "play.sentinelcraft.net";
var PORT = process.env.MC_PORT || 25565;

const query = new Query(HOST, PORT, { timeout: 30000 });

//DISCORD CLIENT
const client = new Client();

const staff = require("./staff.json");
const targets = require("./targets.json");

let OTargets = [];

let guild = null;
let channel = null;

client.once("ready", async () => {
  console.log("Ready!");
  setInterval(function () {
    client.user
      .setPresence({
        game: {
          name: `${process.env.PREFIX}${
            triggers[Math.floor(Math.random() * triggers.length)]
          }`,
        },
      })
      .catch(console.error);
  }, 600000);

  cron.schedule("* * * * *", async () => {
    GetBounties();
  });

  guild = client.guilds.find((g) => g.id == "695334147463446638");
  channel = guild.channels.find((c) => c.id == "723855016242315304");

  const fetched = await channel.fetchMessages({ limit: 99 });
  channel.bulkDelete(fetched);
});

const GetBounties = () => {
  GetPlayers()
    .then((res) => {
      if (query.outstandingRequests === 0) {
        query.close();
      }

      const playerarray = res.players;

      const bounties = Object.keys(targets);

      const OnlineTargets = playerarray.filter((value) =>
        bounties.includes(value)
      );

      const NewTargets = OnlineTargets.filter(
        (value) => !OTargets.includes(value)
      );

      const OldTargets = OTargets.filter(
        (value) => !OnlineTargets.includes(value)
      );

      OTargets = OnlineTargets;

      if (OldTargets.length > 0) {
        OldTargets.forEach((element) => {
          SendAlert(element, "leave");
          console.log("OLD TARGET", element);
        });
      }
      if (NewTargets.length > 0) {
        NewTargets.forEach((element) => {
          SendAlert(element, "join");
          console.log("NEW TARGET", element);
        });
      }
      console.log("ALL TARGETS ONLINE", OTargets);
    })
    .catch((e) => {
      console.error(e);
    });
};

//MAIN LISTENER FOR ALL MESSAGES
client.on("message", async (message) => {
  if (!message.content.startsWith(process.env.PREFIX) || message.author.bot)
    return;
  const args = message.content.slice(process.env.PREFIX.length).split(/ +/);
  console.log(args);
  const command = args.shift().toLowerCase();

  console.log(args);

  if (triggers.includes(command)) {
    GetBounties();
  } else if (command === "increasebounty") {
    if (targets.hasOwnPropertyCI(args[0])) {
      targets[args[0]].bounty += Number(args[1]);
      saveTarget();
      message.channel.send(
        `I increased the bounty on ${args[0]} with ${
          args[1]
        } $, total bounty is now at ${
          targets[args[0]].bounty - targets[args[0]].claimed
        } $`
      );
    } else {
      message.channel
        .send(
          "That target does not yet exist, please make sure you spelled it correctly and that a bounty is already requested for that target"
        )
        .then((m) => m.delete(5000));
    }
  }
});

client.on("error", (e) => console.error(e));
client.on("warn", (e) => console.warn(e));

client.login(process.env.TOKEN);

//HELPER FUNCTIONS

//ADD TRIGGERS FOR THE BOT HERE AS STRINGS, IT WILL REPLY TO THESE WITH THE PLAYERLIST COMMAND
const triggers = ["players", "list", "online", "status", "who"];

//ADD ALL OTHER COMMANDS HERE, THEY WILL BE MERGED TO 1 LIST AND APPEAR IN THE HELP
const commandarray = [...triggers];

/**
 * Description (Searches for a case insensitive key inside the object).
 * @global
 * @augments Object
 * @param {String} prop String to look for in the object
 * @return {Object}
 */
Object.prototype.hasOwnPropertyCI = function (prop) {
  return (
    Object.keys(this).filter(function (v) {
      return v.toLowerCase() === prop.toLowerCase();
    }).length > 0
  );
};

Array.prototype.last = function () {
  return this[this.length - 1];
};

const saveTarget = () => {
  console.log(targets);
  let data = JSON.stringify(targets, null, 2);
  fs.writeFile("targets.json", data, (err) => {
    if (err) throw err;
    console.log("Data written to file");
  });
};

const SendAlert = (target, action) => {
  let message = "";
  switch (action) {
    case "join":
      message = `${target} has joined the server!! Happy hunting\nCurrent bounty is ${
        targets[target].bounty - targets[target].claimed
      } $`;
      break;
    case "leave":
      message = `${target} has left the server!! Better luck next time`;
      setTimeout(() => {
        channel.fetchMessages().then(async (messages) => {
          const filtered = messages.filter((m) => m.content.includes(target));
          channel.bulkDelete(filtered, true).catch((err) => console.error(err));
        });
      }, 5000);
      break;
  }
  channel.send(message);
};

/**
 * Description (function that queries the server and returns a custom made object).
 * @global
 * @return {Object}
 */
const GetPlayers = () => {
  return new Promise(async (resolve, reject) => {
    try {
      query.connect(function (err) {
        query.full_stat((err, stats) => {
          stats == null || stats == undefined
            ? reject("stats are null")
            : resolve({
                players: stats.player_,
                onlinePlayers: stats.numplayers,
                maxPlayers: stats.maxplayers,
              });
          if (err != null) {
            console.log(err);
          }
          reject({ message: "Server is offline", error: err });
        });
      });
    } catch (error) {
      reject(error);
    }
  });
};
