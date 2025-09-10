import React, { useEffect, useState } from 'react';

// Single-file React app (default export) using Tailwind CSS.
// Assumptions: TailwindCSS is configured in the project.
// This app stores data in localStorage so the demo persists across refresh.

const SAMPLE_ITEMS = [
  { id: 'b1', name: 'Normal Brainrot', desc: 'Basic Brainrot.', stock: 5, price: 100 },
  { id: 'b2', name: 'Gold Brainrot', desc: 'Shiny Gold Brainrot.', stock: 3, price: 200 },
  { id: 'b3', name: 'Diamond Brainrot', desc: 'Premium Diamond Brainrot.', stock: 2, price: 500 },
  { id: 'b4', name: 'Rainbow Brainrot', desc: 'Colorful Rainbow Brainrot.', stock: 2, price: 750 },
  { id: 'b5', name: 'Other Brainrots', desc: 'Special/Other Brainrots.', stock: 1, price: 1000 },
];

const STORAGE_KEY = 'steal-a-brainrot-state-v1';

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export default function App() {
  // App state persisted to localStorage to simulate a backend
  const [state, setState] = useState(() => {
    const s = loadState();
    if (s) return s;
    // initial demo state with a SammySelling admin account
    const initial = {
      users: [
        { username: 'SammySelling', password: 'Elliot1993', displayName: 'Sammy (Owner)', isAdmin: true },
      ],
      items: SAMPLE_ITEMS,
      chats: [],
      orders: [],
    };
    saveState(initial);
    return initial;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = sessionStorage.getItem('steal-current-user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => saveState(state), [state]);
  useEffect(() => {
    if (currentUser) sessionStorage.setItem('steal-current-user', JSON.stringify(currentUser));
    else sessionStorage.removeItem('steal-current-user');
  }, [currentUser]);

  const [route, setRoute] = useState('shop');
  const [basket, setBasket] = useState({});

  // --- Auth ---
  function signup(username, password, displayName) {
    if (!username || !password) return { ok: false, error: 'Username and password required' };
    if (state.users.find(u => u.username === username)) return { ok: false, error: 'Username exists' };
    const user = { username, password, displayName: displayName || username, isAdmin: false };
    const newState = { ...state, users: [...state.users, user] };
    setState(newState);
    setCurrentUser({ username: user.username, displayName: user.displayName, isAdmin: false });
    return { ok: true };
  }

  function login(username, password) {
    const user = state.users.find(u => u.username === username && u.password === password);
    if (!user) return { ok: false, error: 'Invalid credentials' };
    setCurrentUser({ username: user.username, displayName: user.displayName || user.username, isAdmin: !!user.isAdmin });
    return { ok: true };
  }

  function signInWithGoogle() {
    const username = 'google_' + Math.random().toString(36).slice(2, 9);
    const user = { username, password: null, displayName: username, isAdmin: false };
    const newState = { ...state, users: [...state.users, user] };
    setState(newState);
    setCurrentUser({ username: user.username, displayName: user.displayName, isAdmin: false });
  }

  function signout() {
    setCurrentUser(null);
    setRoute('shop');
  }

  // --- Admin helpers ---
  function addItemStock(itemId, qty) {
    const items = state.items.map(it => it.id === itemId ? { ...it, stock: it.stock + qty } : it);
    setState({ ...state, items });
  }

  function setItemPrice(itemId, price) {
    const items = state.items.map(it => it.id === itemId ? { ...it, price } : it);
    setState({ ...state, items });
  }

  function createItem(name, desc, stock, price) {
    const id = 'i' + Date.now();
    const items = [...state.items, { id, name, desc, stock: Number(stock), price: Number(price) }];
    setState({ ...state, items });
  }

  // --- Shop / basket ---
  function addToBasket(itemId) {
    const item = state.items.find(i => i.id === itemId);
    if (!item || item.stock <= 0) return;
    setBasket(b => {
      const prev = b[itemId] || 0;
      if (prev + 1 > item.stock) return b;
      return { ...b, [itemId]: prev + 1 };
    });
  }

  function setBasketQty(itemId, qty) {
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;
    const q = Math.max(0, Math.min(item.stock, Math.floor(qty) || 0));
    setBasket(b => ({ ...b, [itemId]: q }));
  }

  function removeFromBasket(itemId) {
    setBasket(b => {
      const copy = { ...b };
      delete copy[itemId];
      return copy;
    });
  }

  function basketTotal() {
    return Object.entries(basket).reduce((sum, [itemId, qty]) => {
      const it = state.items.find(x => x.id === itemId);
      if (!it) return sum;
      return sum + it.price * qty;
    }, 0);
  }

  // --- Purchasing flow ---
  function checkout(useRobux = false) {
    if (!currentUser) { setRoute('login'); return; }
    const items = Object.entries(basket).map(([itemId, qty]) => ({ itemId, qty }));
    if (items.length === 0) return;
    const newChats = [];
    items.forEach(({ itemId, qty }) => {
      for (let i = 0; i < qty; i++) {
        const chatId = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
        const item = state.items.find(it => it.id === itemId);
        const chat = {
          id: chatId,
          user: currentUser.username,
          userDisplay: currentUser.displayName,
          itemId,
          itemName: item.name,
          messages: [{ from: currentUser.username, text: `Hi, I'd like to buy ${item.name}${useRobux ? ' (paying with Robux)' : ''}.`, time: Date.now() }],
          robux: !!useRobux,
          claimed: false,
          completed: false,
        };
        newChats.push(chat);
      }
    });
    const chats = [...state.chats, ...newChats];
    const newState = { ...state, chats };
    setState(newState);
    setBasket({});
    setRoute('chats');
  }

  function sendMessageToChat(chatId, from, text) {
    const chats = state.chats.map(c => c.id === chatId ? { ...c, messages: [...c.messages, { from, text, time: Date.now() }] } : c);
    setState({ ...state, chats });
  }

  function markClaimed(chatId) {
    const chats = state.chats.map(c => c.id === chatId ? { ...c, claimed: true } : c);
    setState({ ...state, chats });
  }

  function confirmSell(chatId) {
    const chat = state.chats.find(c => c.id === chatId);
    if (!chat) return;
    const items = state.items.map(it => it.id === chat.itemId ? { ...it, stock: Math.max(0, it.stock - 1) } : it);
    const chats = state.chats.map(c => c.id === chatId ? { ...c, completed: true } : c);
    setState({ ...state, items, chats });
  }

  function Header() {
    return (
      <header className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-700 via-sky-500 to-blue-400 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center font-bold">S</div>
          <div>
            <div className="font-bold">Steal A Brainrot</div>
            <div className="text-sm text-blue-100">Brainrots for sale — blue vibes</div>
          </div>
        </div>
        <nav className="flex items-center gap-3">
          <button className="btn" onClick={() => setRoute('shop')}>Shop</button>
          <button className="btn" onClick={() => setRoute('chats')}>Chats</button>
          {currentUser && currentUser.isAdmin && (
            <button className="btn" onClick={() => setRoute('admin')}>Admin</button>
          )}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <span className="text-sm">{currentUser.displayName}</span>
              <button className="btn" onClick={signout}>Sign out</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button className="btn" onClick={() => setRoute('login')}>Log in</button>
              <button className="btn" onClick={() => setRoute('signup')}>Sign up</button>
            </div>
          )}
        </nav>
      </header>
    );
  }

  function ShopView() {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Shop</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {state.items.map(item => (
            <div key={item.id} className="p-4 rounded-2xl shadow-lg bg-gradient-to-b from-white to-blue-50">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold">{item.name}</div>
                  <div className="text-sm text-slate-600">{item.desc}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">{item.price} credits</div>
                  <div className="text-sm">Stock: {item.stock}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button className="px-3 py-1 rounded bg-black text-white" onClick={() => addToBasket(item.id)}>Add</button>
                <input type="number" value={basket[item.id] || 0} onChange={(e) => setBasketQty(item.id, Number(e.target.value))} className="w-20 p-1 rounded" min={0} max={item.stock} />
                <button className="ml-auto btn" onClick={() => { setBasket(b => ({ ...b, [item.id]: Math.min(item.stock, (b[item.id] || 0) + 1) })); }}>+1</button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded bg-white/80 shadow">
          <h3 className="font-bold">Basket</h3>
          {Object.keys(basket).length === 0 ? (
            <div className="text-sm text-slate-600">Your basket is empty.</div>
          ) : (
            <div>
              <ul className="space-y-2">
                {Object.entries(basket).map(([itemId, qty]) => {
                  const it = state.items.find(x => x.id === itemId);
                  if (!it) return null;
                  return (
                    <li key={itemId} className="flex items-center gap-3">
                      <div className="grow">
                        <div className="font-semibold">{it.name}</div>
                        <div className="text-sm">{qty} × {it.price} = {qty * it.price}</div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn" onClick={() => setBasketQty(itemId, qty - 1)}>-</button>
                        <button className="btn" onClick={() => setBasketQty(itemId, qty + 1)}>+</button>
                        <button className="btn" onClick={() => removeFromBasket(itemId)}>Remove</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex items-center justify-between">
                <div className="font-bold">Total: {basketTotal()} credits</div>
                <div className="flex gap-2">
                  <button className="btn" onClick={() => checkout(false)}>Buy with Credits</button>
                  <button className="btn" onClick={() => checkout(true)}>Buy with Robux</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function LoginView() {
    const [user, setUser] = useState('');
    const [pass, setPass] = useState('');
    const [error, setError] = useState(null);

    function doLogin(e) {
      e.preventDefault();
      const res = login(user, pass);
      if (!res.ok) setError(res.error);
      else { setError(null); setRoute('shop'); }
    }

    return (
      <div className="p-6 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4">Log in</h2>
        <form onSubmit={doLogin} className="space-y-3 bg-white/80 p-4 rounded">
          <input className="w-full p-2 rounded" placeholder="Username" value={user} onChange={e => setUser(e.target.value)} />
          <input type="password" className="w-full p-2 rounded" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} />
          {error && <div className="text-red-600">{error}</div>}
          <div className="flex gap-2">
            <button className="btn" type="submit">Log in</button>
            <button type="button" className="btn" onClick={signInWithGoogle}>Sign in with Google</button>
          </div>
        </form>
      </div>
    );
  }

  function SignupView() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [display, setDisplay] = useState('');
    const [error, setError] = useState(null);

    function doSignup(e) {
      e.preventDefault();
      const res = signup(username, password, display);
      if (!res.ok) setError(res.error);
      else { setError(null); setRoute('shop'); }
    }

    return (
      <div className="p-6 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4">Sign up</h2>
        <form onSubmit={doSignup} className="space-y-3 bg-white/80 p-4 rounded">
          <input className="w-full p-2 rounded" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          <input className="w-full p-2 rounded" placeholder="Display name" value={display} onChange={e => setDisplay(e.target.value)} />
          <input type="password" className="w-full p-2 rounded" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <div className="text-red-600">{
