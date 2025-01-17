import "./App.css";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { useCollectionData } from "react-firebase-hooks/firestore";
import { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { useParams } from "react-router";
import { config } from "./config";

firebase.initializeApp(config);
const firestore = firebase.firestore();
const linksRef = firestore.collection("links");
const auth = firebase.auth();

function generateRandomStr(length) {
  var text = "";
  var possible = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route exact path='/' element={<MyApp />} />
        <Route path='/:id' element={<Redirector />} />
      </Routes>
    </Router>
  );
}

function MyApp() {
  const [user] = useAuthState(auth);
  return (
    <div className='App'>
      <Navbar curuser={user} />
      {!user && <PleaseSignIn />}
      {user && <InputForm />}
    </div>
  );
}

function InputForm() {
  const [formValue, setFormValue] = useState("");
  const [word, setWord] = useState("");
  const { uid } = auth.currentUser;
  let query = linksRef.orderBy("createdAt", "desc");
  let [links] = useCollectionData(query, { idField: "id" });
  let shortLink = word === "" ? generateRandomStr(4) : word;

  async function submitEvent(e) {

    const validRegex = /([\d\w][\d\w_-]*[\d\w])|([\w\d])/;
    if(!validRegex.test(shortLink)){
      alert(`Custom words (for custom short link) must conatin alphabets, numbers. It may contain hyphens and underscores in between, but not at ends.`);
      return;
    }

    while (true) {
      // eslint-disable-next-line no-loop-func
      let temp = links.filter((link) => {
        return link.shortLink.toString() === shortLink;
      });

      if (temp.length === 0) {
        break;
      } else {
        const poss = "123456789";
        shortLink += poss.charAt(Math.floor(Math.random() * poss.length));
      }
    }
    e.preventDefault();
    const value = formValue;
    setFormValue("");
    setWord("");
    //console.log(auth.currentUser);
    if (value !== "") {
      await linksRef.add({
        longLink: value,
        shortLink: shortLink,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        user: uid,
      });
    }
  }

  return (
    <>
      <form onSubmit={submitEvent}>
        <div className='inputform'>
          <input
            type='text'
            placeholder='Enter the link Here'
            value={formValue}
            onChange={(e) => setFormValue(e.target.value)}></input>
          {"  "}
          <button>Forge</button>
          <br></br>
          <br></br>
          <input
            type='text'
            placeholder='custom words here'
            value={word}
            onChange={(e) => setWord(e.target.value)}></input>{" "}
          <button className='invisible' disabled>
            Forge
          </button>
        </div>
      </form>
      <MyTable links={links} uid={uid} />
    </>
  );
}

function MyTable(props) {
  const links = props.links;
  return (
    <table>
      <thead>
        <tr>
          {/*<th>User ID</th>*/}
          <th>Actual Link</th>
          <th>Short Link</th>
          <th>Deletion</th>
        </tr>
      </thead>
      <tbody>
        {links &&
          links
            .filter((link) => {
              return link.user.toString() === auth.currentUser.uid.toString();
            })
            .map((link) => {
              let { longLink, shortLink } = link;
              const site = window.location.href;

              if (
                !(
                  longLink.startsWith("https://") ||
                  longLink.startsWith("http://")
                )
              ) {
                longLink = "https://" + longLink;
              }

              function deleteHandler() {
                //console.log(link);
                linksRef.doc(link.id).delete();
              }

              function copyHandler() {
                const redirect = site + shortLink;
                navigator.clipboard.writeText(redirect);
              }

              function copyHandler2() {
                navigator.clipboard.writeText(longLink);
              }

              return (
                <tr key={link.id.toString()}>
                  {/*<td>{user}</td>*/}
                  <td>
                    <img
                      onClick={copyHandler2}
                      alt='copy'
                      src='copy.png'
                      className='copyimage'></img>
                    {"     "}
                    <a href={longLink}>{longLink}</a>
                  </td>
                  <td>
                    <img
                      onClick={copyHandler}
                      alt='copy'
                      src='copy.png'
                      className='copyimage'></img>
                    {"     "}
                    <a href={`/${shortLink}`}>{`/${shortLink}`}</a>
                  </td>
                  <td>
                    <button onClick={deleteHandler}>Delete</button>
                  </td>
                </tr>
              );
              //console.log(link);
            })}
      </tbody>
    </table>
  );
}

function PleaseSignIn() {
  return (
    <div className='pleasesignin'>
      <br></br>
      <br></br>
      <br></br>
      <br></br>
      <br></br>
      <br></br>
      <br></br>
      <h1>Please Sign In to Continue :)</h1>
    </div>
  );
}

function SignOut() {
  const { photoURL, displayName } = auth.currentUser;
  //console.log(auth.currentUser);
  return (
    auth.currentUser && (
      <div className='sign-out'>
        <button onClick={() => auth.signOut()}>Sign Out</button>
        <img src={photoURL} alt={displayName}></img>
      </div>
    )
  );
}

function Navbar(props) {
  return (
    <div className='navbar'>
      <h1>🔥Fire Fly Link</h1>
      <div className='links'>
        {props.curuser && <SignOut />}
        {!props.curuser && <SignIn />}
      </div>
    </div>
  );
}

function SignIn() {
  const signInWithGoogle = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
  };
  return (
    <div className='sign-in'>
      <button onClick={signInWithGoogle}>Sign in with Google</button>
    </div>
  );
}

/*function DuoButton(props) {
  return (
    <div className='duobutton'>
      <p>{props.children}</p>
    </div>
  );
}*/

function Redirector(props) {
  const { id } = useParams();
  let query = linksRef.where("shortLink", "==", id);
  const [isFound, setIsFound] = useState(false);
  //const navigate = useNavigate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(async () => {
    const querySnapshot = await query.limit(1).get();
    const doc = querySnapshot.docs[0];
    var long = doc.data().longLink.toString();

    if (long) {
      setIsFound(true);
      if (!(long.startsWith("https://") || long.startsWith("http://"))) {
        window.location.replace("https://" + long);
      } else {
        window.location.replace(doc.data().longLink);
      }
    } else {
      setIsFound(false);
    }
  }, []);

  return isFound ? (
    <h3>{"   "}Redirecting ...</h3>
  ) : (
    <h3>Error 404 : link not found</h3>
  );
}

export default App;
