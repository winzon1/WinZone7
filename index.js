// pages/index.js
import { useState, useEffect } from "react";
import axios from "axios";

export default function Home() {
  const [page, setPage] = useState("signup");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [wallet, setWallet] = useState(0);
  const [amount, setAmount] = useState("");
  const [simNumber, setSimNumber] = useState("");
  const [matches, setMatches] = useState([]);
  const [bets, setBets] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [gameType, setGameType] = useState("football");
  const [selectedCountry, setSelectedCountry] = useState("All");

  const isAdmin = phone === process.env.NEXT_PUBLIC_ADMIN_PHONE;

  useEffect(() => {
    if (page === "dashboard") fetchMatches();
    const interval = setInterval(() => { if(page === "dashboard") autoSettle(); }, 60000);
    return () => clearInterval(interval);
  }, [page]);

  const fetchMatches = async () => {
    try {
      const url = selectedCountry === "All"
        ? "https://v3.football.api-sports.io/fixtures?live=all"
        : `https://v3.football.api-sports.io/fixtures?live=all&country=${selectedCountry}`;
      const res = await axios.get(url, {
        headers: { "x-apisports-key": process.env.NEXT_PUBLIC_API_FOOTBALL_KEY }
      });
      setMatches(res.data.response.map(m => ({
        match_id: m.fixture.id,
        home: m.teams.home.name,
        away: m.teams.away.name,
        status: m.fixture.status.short,
        odds: {
          home: 1.5, draw: 3, away: 2,
          gg: 1.8, ng: 2, htft: { "home-home": 5, "home-draw": 6, "draw-home": 6 }, 
          correct_score: { "1-0": 8, "2-1": 9, "0-0": 10 }, 
          over25: 1.9, under25: 1.9
        }
      })));
    } catch { console.error("Fetch matches failed"); }
  };

  const autoSettle = async () => {
    try {
      const res = await axios.post("/api/winzone", { action: "settle-bets", phone });
      if (res.data.totalWin > 0) setWallet(wallet + res.data.totalWin);
    } catch {}
  };

  const handleSignup = async () => {
    try {
      const res = await axios.post("/api/winzone", { action: "signup", email, phone, password });
      alert(res.data.message);
      setPage("login");
    } catch (err) { alert(err.response?.data?.error || "Signup failed"); }
  };

  const handleLogin = async () => {
    try {
      const res = await axios.post("/api/winzone", { action: "login", phone, password });
      alert(res.data.message);
      setWallet(res.data.wallet);
      setPage("dashboard");
      if (isAdmin) fetchAdminUsers();
    } catch { alert("Login failed"); }
  };

  const fetchAdminUsers = async () => {
    try {
      const res = await axios.post("/api/winzone", { action: "admin-users" });
      setAdminUsers(res.data);
    } catch {}
  };

  const handleDeposit = async () => {
    try {
      const res = await axios.post("/api/winzone", { action: "deposit", phone, amount: Number(amount) });
      window.location.href = res.data.checkout_url;
    } catch {}
  };

  const handleWithdraw = async () => {
    try {
      const res = await axios.post("/api/winzone", { action: "withdraw", phone, amount: Number(amount), simNumber });
      setWallet(res.data.wallet);
      alert(res.data.message);
    } catch {}
  };

  const addBet = (bet) => setBets([...bets, bet]);

  const placeBets = async () => {
    for (let b of bets) {
      await axios.post("/api/winzone", { action: "place-bet", phone, ...b });
    }
    setWallet(wallet - bets.reduce((a,b) => a + b.stake, 0));
    setBets([]);
    alert("Bets placed");
  };

  const btnStyle = { padding: "5px 10px", margin: "2px", background: "#0a192f", color: "#fff", borderRadius: "5px", cursor: "pointer" };
  const matchStyle = { border: "1px solid #555", padding: "10px", marginBottom: "10px", borderRadius: "8px" };

  // ---------------- Football Panel ----------------
  const FootballPanel = ({ matches }) => (
    <>
      <h3>Live Football Matches</h3>
      {matches.map((m) => (
        <div key={m.match_id} style={matchStyle}>
          <p><strong>{m.home}</strong> vs <strong>{m.away}</strong> ({m.status})</p>

          {/* Winner 1X2 */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
            {["home", "draw", "away"].map(t => (
              <button key={t} style={btnStyle} onClick={() => addBet({ match_id: m.match_id, type: t, stake: 10, odds: m.odds[t], gameType: "football" })}>
                {t.toUpperCase()} ({m.odds[t]})
              </button>
            ))}
          </div>

          {/* HT/FT */}
          <div style={{ marginBottom: "10px" }}>
            <p>Half-Time / Full-Time</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {Object.entries(m.odds.htft).map(([key, value]) => (
                <button key={key} style={btnStyle} onClick={() => addBet({ match_id: m.match_id, type: "htft", stake: 10, odds: value, htft: key, gameType: "football" })}>
                  {key.toUpperCase()} ({value})
                </button>
              ))}
            </div>
          </div>

          {/* Correct Score */}
          <div style={{ marginBottom: "10px" }}>
            <p>Correct Score</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {Object.entries(m.odds.correct_score).map(([score, value]) => (
                <button key={score} style={btnStyle} onClick={() => addBet({ match_id: m.match_id, type: "correct_score", stake: 10, odds: value, correctScore: score, gameType: "football" })}>
                  {score} ({value})
                </button>
              ))}
            </div>
          </div>

          {/* GG / NG */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <button style={btnStyle} onClick={() => addBet({ match_id: m.match_id, type: "gg", stake: 10, odds: m.odds.gg, gameType: "football" })}>
              GG ({m.odds.gg})
            </button>
            <button style={btnStyle} onClick={() => addBet({ match_id: m.match_id, type: "ng", stake: 10, odds: m.odds.ng, gameType: "football" })}>
              NG ({m.odds.ng})
            </button>
          </div>

          {/* Over / Under 2.5 */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <button style={btnStyle} onClick={() => addBet({ match_id: m.match_id, type: "over25", stake: 10, odds: m.odds.over25, gameType: "football" })}>
              Over 2.5 ({m.odds.over25})
            </button>
            <button style={btnStyle} onClick={() => addBet({ match_id: m.match_id, type: "under25", stake: 10, odds: m.odds.under25, gameType: "football" })}>
              Under 2.5 ({m.odds.under25})
            </button>
          </div>

        </div>
      ))}
    </>
  );

  // ---------------- Dashboard UI ----------------
  if (page === "dashboard") return (
    <div style={{ maxWidth: "700px", margin: "50px auto", padding: "20px", backgroundColor: "#112240", color: "#fff", borderRadius: "10px" }}>
      <h2>Wallet: KES {wallet}</h2>
      <div style={{ marginBottom: "20px" }}>
        <input placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
        <button style={btnStyle} onClick={handleDeposit}>Deposit</button>
        <input placeholder="Sim Number" value={simNumber} onChange={e => setSimNumber(e.target.value)} />
        <button style={btnStyle} onClick={handleWithdraw}>Withdraw</button>
      </div>

      <FootballPanel matches={matches} />

      {/* Bet Slip */}
      <div style={{ marginTop: "20px" }}>
        <h3>Bet Slip</h3>
        {bets.map((b,i) => <p key={i}>{b.gameType} - {b.type} ({b.odds}) Stake: {b.stake}</p>)}
        {bets.length>0 && <button style={btnStyle} onClick={placeBets}>Place Bets</button>}
      </div>

      {/* Admin Panel */}
      {isAdmin && <div style={{ marginTop: "30px" }}>
        <h3>Admin Users</h3>
        {adminUsers.map(u => <p key={u.phone}>{u.phone} - Wallet: {u.wallet}</p>)}
      </div>}
    </div>
  );

  // ---------------- Signup/Login UI ----------------
  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px", backgroundColor: "#112240", color: "#fff", borderRadius: "10px" }}>
      {page==="signup" ? (
        <>
          <h2>Signup</h2>
          <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} />
          <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button style={btnStyle} onClick={handleSignup}>Signup</button>
          <p onClick={()=>setPage("login")} style={{cursor:"pointer", color:"#64ffda"}}>Already have an account? Login</p>
        </>
      ) : (
        <>
          <h2>Login</h2>
          <input placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} />
          <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button style={btnStyle} onClick={handleLogin}>Login</button>
          <p onClick={()=>setPage("signup")} style={{cursor:"pointer", color:"#64ffda"}}>No account? Signup</p>
        </>
      )}
    </div>
  );
        }
