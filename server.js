const express = require("express");
const cors = require("cors");
const app = express();
const fs = require("fs");
const fileUpload = require("express-fileupload");
const pdfParse = require("pdf-parse");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const _ = require("lodash");
const path = require("path");
const axios = require("axios").default;

const SOCKET = "192.168.18.159:3021";
const IP = "192.168.18.159";
const VARPORT = "3020";

var corsOptions = {
  origin: `http://${SOCKET}`,
};
const mariadb = require("mariadb");
const pool = mariadb.createPool({
  host: "db",
  user: "user",
  password: "password",
  database: "sq",
});
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(
  fileUpload({
    createParentPath: true,
  })
); //ATTENTION REND IMPOSSIBLE D UPLOAD DE FILE

// database
const db = require("./app/models");
const Role = db.role;
const User = db.user;
const Start = db.start;

const dbArbre = require("./app/modelsArbre");

const { user } = require("./app/models");
const Pb = dbArbre.pb;
const S1 = dbArbre.s1;
const S2 = dbArbre.s2;
const Solutions = dbArbre.solutions;

db.sequelize.sync({ force: true });
dbArbre.sequelize.sync({ force: false });
//FORCE TRUE = CREE UNE NOUVELLE TABLE; FORCE FALSE = TABLE INCHANGÉ ; ALTER = AJOUT DES NOUVELLE CHOSES
// set port, listen for requests

const PORT = process.env.PORT || VARPORT;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
// const STORAGEPATH = "../react-jwt-auth/react-jwt-auth/public/pdf";
const STORAGEPATH = "./pdf";
// routes
require("./app/routes/auth.routes")(app);
require("./app/routes/user.routes")(app);

// simple route
app.get("/", (req, resu) => {
  //CREER LES ROLES PAR DÉFAUT ET LE COMPTE ADMIN LORS DU PREMIER LANCEMENT S'IL N'EXISTENT PAS DÉJÀ
  Role.findOrCreate({
    where: {
      id: 1,
    },
    defaults: {
      // set the default properties if it doesn't exist
      id: 1,
      name: "user",
    },
  });
  Role.findOrCreate({
    where: {
      id: 2,
    },
    defaults: {
      id: 2,
      name: "admin",
    },
  });

  Role.findOrCreate({
    where: {
      id: 3,
    },
    defaults: {
      id: 3,
      name: "xivo",
    },
  });

  Role.findOrCreate({
    where: {
      id: 4,
    },
    defaults: {
      id: 4,
      name: "cebox",
    },
  });

  Start.findOrCreate({
    where: {
      id: 1,
    },
    defaults: {
      started: 0,
    },
  }).then(() => {
    Start.findByPk(1).then((res) => {
      if (res.started !== 1) {
        axios.post(`http://${IP}:${VARPORT}/api/auth/signup`, {
          username: "admin",
          email: "admin@admin.com",
          password: "admin",
          roles: ["user", "xivo", "cebox", "admin"],
        });
        Start.update({ started: 1 }, { where: { id: 1 } });
        resu.send("Initialised correctly");
      } else {
        resu.send("Already started");
      }
    });
  });
});

//************************************* */
app.post("/upload-avatar/:techno/:id&:from", async (req, res) => {
  const from = req.params.from;
  if (from === "s2") {
    try {
      if (!req.files) {
        res.send({
          status: false,
          message: "No file uploaded",
        });
      } else {
        //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
        let avatar = req.files.file;

        //Use the mv() method to place the file in upload directory (i.e. "uploads")
        avatar.mv(STORAGEPATH + "/" + avatar.name);
        Solutions.create({
          text: avatar.name,
          ind_s2: req.params.id,
          techno: req.params.techno,
        });
        //send response
        res.status(200).send({
          status: true,
          message: "File is uploaded",
          data: {
            name: avatar.name,
            mimetype: avatar.mimetype,
            size: avatar.size,
          },
        });
      }
    } catch (err) {
      res.status(500).send(err);
    }
  } else {
    try {
      if (!req.files) {
        res.send({
          status: false,
          message: "No file uploaded",
        });
      } else {
        //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
        let avatar = req.files.file;

        //Use the mv() method to place the file in upload directory (i.e. "uploads")
        avatar.mv(STORAGEPATH + "/" + avatar.name);
        Solutions.create({
          text: avatar.name,
          ind_s11: req.params.id,
          techno: req.params.techno,
        });
        //send response
        res.status(200).send({
          status: true,
          message: "File is uploaded",
          data: {
            name: avatar.name,
            mimetype: avatar.mimetype,
            size: avatar.size,
          },
        });
      }
    } catch (err) {
      res.status(500).send(err);
    }
  }
});

//************************************* */

app.get("/pb/:techno", (req, resu) => {
  //TECHNO
  Pb.findAll({ where: { techno: req.params.techno } })
    .then((pbs) => {
      resu.status(200).send(JSON.stringify(pbs));
    })
    .catch((err) => {
      err.status(500).send({ message: err.message });
    });
});

// PERMET DE FILTRER LES ELEMENTS DE L'ARBRE
app.get("/searchpb/:techno/:findabr", (req, resu) => {
  //TECHNO
  Pb.findAll({
    where: {
      [Op.and]: [
        { title_pb: { [Op.substring]: req.params.findabr } },
        { techno: req.params.techno },
      ],
      title_pb: {
        [Op.substring]: req.params.findabr, //[Op.substring]: 'hat' <=> LIKE '%hat%'
      },
    },
  })
    .then((pbs) => {
      resu.status(200).send(JSON.stringify(pbs));
    })
    .catch((err) => {
      resu.status(500).send({ message: err.message });
    });
});

app.get("/s1/:id", (req, resu) => {
  S1.findAll({ where: { ind_pb: req.params.id } }).then((res) => {
    if (res === null) {
      console.log("Not found!");
    } else {
      resu.status(200).send(JSON.stringify(res));
    }
  });
});

app.get("/searchs1/:id&:findabr", (req, resu) => {
  S1.findAll({
    where: {
      [Op.and]: [
        { title_s1: { [Op.substring]: req.params.findabr } },
        { ind_pb: req.params.id },
      ],
      title_s1: {
        [Op.substring]: req.params.findabr, //[Op.substring]: 'hat' <=> LIKE '%hat%'
      },
    },
  })
    .then((pbs) => {
      resu.status(200).send(JSON.stringify(pbs));
    })
    .catch((err) => {
      resu.status(500).send({ message: err.message });
    });
});

app.get("/s2/:id", (req, resu) => {
  S2.findAll({ where: { ind_s1: req.params.id } }).then((res) => {
    if (res === null) {
      console.log("Not found!");
    } else {
      resu.send(JSON.stringify(res));
    }
  });
});

app.get("/solutions/:id", (req, resu) => {
  pool
    .getConnection()
    .then((conn) => {
      conn
        .query(
          "SELECT * FROM s2 JOIN solutions ON id_s2 = solutions.ind_s2 WHERE ind_s2 = ?;",
          [req.params.id]
        )
        .then((res) => {
          resu.send(res);
          conn.end();
        })
        .catch((err) => {
          console.log(err);
          conn.end();
        });
    })
    .catch((err) => {
      console.log("Not connected !");
    });
});

app.get("/solutionsbis/:id", (req, resu) => {
  pool
    .getConnection()
    .then((conn) => {
      conn
        .query(
          "SELECT COUNT(id_s2) FROM s1 join s2 on id_s1 = s2.ind_s1 where id_s1 = " +
            req.params.id +
            ";"
        )
        .then((diag) => {
          if (diag[0]["COUNT(id_s2)"] === 0n) {
            conn
              .query(
                "SELECT * FROM s1 JOIN solutions ON id_s1 = solutions.ind_s11 WHERE ind_s11 = ?;",
                [req.params.id]
              )
              .then((res) => {
                resu.send(res);
                conn.end();
              })
              .catch((err) => {
                console.log(err);
                conn.end();
              });
          } else {
            resu.send();
            conn.end();
          }
        });
    })
    .catch((err) => {
      console.log("Not connected !");
    });
});

//SUPPRIMER UN FICHIER PDF
app.get("/solutions/del/:id&:from", (req, resu) => {
  console.log(req.params.from, req.params.id);
  if (req.params.from === "s1") {
    var uri = "SELECT * FROM solutions WHERE ind_s11 = " + req.params.id + ";";
    var uri2 = "DELETE FROM solutions WHERE ind_s11 = " + req.params.id + ";";
  } else {
    var uri = "SELECT * FROM solutions WHERE ind_s2 = " + req.params.id + ";";
    var uri2 = "DELETE FROM solutions WHERE ind_s2 = " + req.params.id + ";";
  }

  pool.getConnection().then((conn) => {
    conn
      .query(uri)
      .then((res) => {
        file = res[0];
        const path = STORAGEPATH + "/" + file.text;
        querie =
          "SELECT COUNT(text) as count FROM solutions WHERE text = '" +
          file.text +
          "';";

        conn
          .query(querie)
          .then((res) => {
            console.log("RES : ", res);
            if (res[0].count === 1n) {
              fs.unlink(path, (err) => {
                if (err) {
                  console.error("Erreur de suppression du PDF", err);
                  return;
                }
              });
            }
            conn.query(uri2).then((e) => {
              console.log("IN2", e);
              resu.status(200).send();
              conn.end();
            });
          })
          .catch((err) => {
            console.log(err);
            conn.end();
          });
      })
      .catch((err) => {
        console.log("Not connected !");
      });
  });
});

app.put("/update/:db&:value&:newVal&:id&:champ", (req, resu) => {
  if (req.params.db === "pb") {
    id_db = "id";
  } else if (req.params.db === "s1") {
    id_db = "id_s1";
  } else if (req.params.db === "s2") {
    id_db = "id_s2";
  }

  re =
    "UPDATE " +
    req.params.db +
    "  SET " +
    req.params.champ +
    " = '" +
    req.params.newVal +
    "' WHERE " +
    id_db +
    " = '" +
    req.params.id +
    "';";

  pool
    .getConnection()
    .then((conn) => {
      conn
        .query(re)
        .then((res) => {
          conn.end();
        })
        .catch((err) => {
          console.log(err);
          conn.end();
        });
    })
    .catch((err) => {
      console.log("Not connected !");
    });
});

app.post("/create/:db&:id&:newVal&:champ&:champ2", (req, resu) => {
  //TECHNO
  if (req.params.db === "pb") {
    re =
      "INSERT INTO " +
      req.params.db +
      " (" +
      req.params.champ +
      ", techno) VALUES ('" +
      req.params.newVal +
      "', '" +
      req.params.champ2 +
      "');";
  } else {
    re =
      "INSERT INTO " +
      req.params.db +
      " (" +
      req.params.champ +
      ", " +
      req.params.champ2 +
      ") VALUES ('" +
      req.params.newVal +
      "'," +
      req.params.id +
      ");";
  }
  pool
    .getConnection()
    .then((conn) => {
      conn
        .query(re)
        .then((res) => {
          conn.end();
        })
        .catch((err) => {
          console.log(err);
          conn.end();
        });
    })
    .catch((err) => {
      console.log("Not connected !");
    });
});

app.delete("/delete/:id&:db&:champ", (req, resu) => {
  re =
    "DELETE FROM  " +
    req.params.db +
    " WHERE " +
    req.params.champ +
    " = " +
    req.params.id +
    ";";
  //Comparer les fichiers pdf avant et après. En cas de delete onCascade supression des fichier correspondants
  re2 = "SELECT text FROM solutions;";
  global.tab;
  global.tab2;
  global.bool;
  pool
    .getConnection()
    .then((conn) => {
      conn.query(re2).then((tab) => {
        conn
          .query(re)
          .then((res) => {
            conn
              .query(
                "DELETE FROM solutions where ind_s2 IS NULL AND ind_s11 IS NULL;"
              )
              .then((resi) => {
                conn.query(re2).then((tab2) => {
                  conn.end();
                  varValues = tab2.map((re) => re.text);
                  tab.map((item, i) => {
                    // if (varValues[i] !== undefined) {
                    bool = varValues.includes(item.text);
                    if (!bool) {
                      const path = STORAGEPATH + "/" + item.text;
                      fs.unlink(path, (err) => {
                        if (err) {
                          console.error("Erreur de suppression du PDF", err);
                          return;
                        }
                      });
                    }
                    // }
                  });
                });
              });
          })
          .catch((err) => {
            console.log(err);
            conn.end();
          });
      });
    })
    .catch((err) => {
      console.log("Not connected !");
    });
});

// RECHERCHER DU TEXT DANS UN PDF
app.get("/extract-text/:techno", (req, resu) => {
  // RAJOUT TECHNO
  pool.getConnection().then((conn) => {
    conn
      .query(
        "SELECT text FROM solutions WHERE techno = '" + req.params.techno + "';"
      )
      .then((data) => {
        var listFileByTechno = [];
        for (let k = 0; k < data.length; k++) {
          listFileByTechno.push(data[k].text);
        }
        // RAJOUT TECHNO

        const directoryPath = path.join(__dirname, STORAGEPATH);
        //passsing directoryPath and callback function
        fs.readdir(directoryPath, function (err, files) {
          if (err) {
            return console.log("Unable to scan directory: " + err);
          }
          //listing all files using forEach
          var tab = [];
          files.forEach((file, i) => {
            // vérifier que le fichier appartient bien a l'arbre de provenance (XIVO / CEBOX)
            var bool = false;
            listFileByTechno.map((item) => {
              value = file.includes(item);
              if (value) {
                bool = true;
              }
            });
            if (bool) {
              const logo = fs.readFileSync(STORAGEPATH + "/" + file);
              pdfParse(logo).then((res) => {
                textLower = res.text.toLocaleLowerCase();
                textSplited = textLower.split("\n");
                searchTitle = false;
                varTitle = "";
                varTab = [];
                varTab2 = [];
                varBool = textLower.includes(
                  req.query.search.toLocaleLowerCase()
                );

                try {
                  for (let i = 0; i < textSplited.length; i++) {
                    textparsed = textSplited[i].search(
                      req.query.search.toLocaleLowerCase()
                    );
                    if (textparsed !== -1) {
                      flag = false;
                      j = i;
                      while (!flag) {
                        varPoint = textSplited[j].search("\\.");
                        if (varPoint !== -1) {
                          varTab.push(textSplited[j].slice(0, varPoint + 1));
                          flag = !flag;
                        } else {
                          varTab.push(textSplited[j]);
                        }
                        j++;
                      }
                      if (varTab2.length > 10) {
                        break;
                      } else {
                        varTab2[i] = varTab.join(" ");
                        varTab = [];
                      }
                    }
                    console.log("vartab2 :", varTab2);
                    console.log("textsplitted :", textSplited);

                    if (!searchTitle && varTab2.length === 0) {
                      textparsed = textSplited[i].search("[a-z]");
                      console.log(textparsed);
                      if (textparsed !== -1) {
                        varTitle = textSplited[i];
                        console.log(varTitle);
                        searchTitle = !searchTitle;
                      }
                    }
                  }
                } catch (error) {
                  console.log(error);
                }

                var filtered = varTab2.filter(function (el) {
                  return el != null;
                });
                final = filtered.join(" AAA ");
                if (varTab2.length !== 0) {
                  tab.push({
                    text: final,
                    titre: file,
                    titredoc: varTitle,
                  });
                }
              });
            }
          });
          setTimeout(() => {
            // console.log(JSON.stringify(tab));
            resu.send(JSON.stringify(tab));
          }, 50);
        });
      });
  });
});

app.get("/roles", (req, resu) => {
  Role.findAll().then((res) => {
    if (res === null) {
      console.log("Not found!");
    } else {
      resu.send(JSON.stringify(res));
    }
  });
});

app.get("/api/get/users", (req, resu) => {
  User.findAll({
    include: [
      {
        model: Role,
        through: {
          attributes: ["roleId"],
          // where: { completed: true },
        },
      },
    ],
  }).then((res) => {
    if (res) {
      resu.send(JSON.stringify(res, null, 2));
    } else {
      resu.send("No user find");
    }
  });
});

app.post("/api/del/user/:id", (req, resu) => {
  User.findByPk(req.params.id).then((row) => {
    res = row.destroy({
      include: [
        {
          model: Role,
          through: {
            attributes: ["roleId", "userId"],
            // where: { completed: true },
          },
        },
      ],
    });
    resu.send(res);
  });
});

app.get("/api/get/allroles", (req, resu) => {
  Role.findAll({ attributes: ["name", "id"] }).then((res) =>
    resu.send(JSON.stringify(res))
  );
});

app.put("/api/update/roles/:id", (req, resu) => {
  try {
    user.findOne({ where: { id: req.params.id } }).then((user) => {
      user.setRoles(req.body.addroles).then((updated) => {
        resu.send({
          id: req.params.id,
          body: req.body.addroles,
          users: user,
          update: updated,
        });
      });
    });
  } catch (error) {
    console.log("Erreur de modification des roles: \n", error);
  }
});
