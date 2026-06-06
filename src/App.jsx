import { useState, useEffect, useRef, useCallback } from "react";
import {
  sendOTPToPhone, verifyOTP,
  writeShared, readShared, subscribeShared,
  writeUserDoc, readUserDoc,
} from "./firebase.js";
import AudioEngine from "./audio.js";

const QR_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 21 21'%3E%3Crect width='21' height='21' fill='white'/%3E%3Crect x='0' y='0' width='7' height='7' fill='none' stroke='%23000' stroke-width='1'/%3E%3Crect x='2' y='2' width='3' height='3' fill='%23000'/%3E%3Crect x='14' y='0' width='7' height='7' fill='none' stroke='%23000' stroke-width='1'/%3E%3Crect x='16' y='2' width='3' height='3' fill='%23000'/%3E%3Crect x='0' y='14' width='7' height='7' fill='none' stroke='%23000' stroke-width='1'/%3E%3Crect x='2' y='16' width='3' height='3' fill='%23000'/%3E%3Crect x='9' y='1' width='1' height='1' fill='%23000'/%3E%3Crect x='11' y='1' width='1' height='1' fill='%23000'/%3E%3Crect x='8' y='5' width='1' height='2' fill='%23000'/%3E%3Crect x='10' y='5' width='3' height='1' fill='%23000'/%3E%3Crect x='7' y='9' width='3' height='1' fill='%23000'/%3E%3Crect x='11' y='8' width='2' height='2' fill='%23000'/%3E%3Crect x='14' y='9' width='3' height='1' fill='%23000'/%3E%3Crect x='18' y='8' width='2' height='2' fill='%23000'/%3E%3Crect x='9' y='11' width='4' height='1' fill='%23000'/%3E%3Crect x='8' y='13' width='5' height='1' fill='%23000'/%3E%3Crect x='9' y='15' width='2' height='2' fill='%23000'/%3E%3Crect x='13' y='15' width='1' height='3' fill='%23000'/%3E%3Crect x='16' y='15' width='2' height='1' fill='%23000'/%3E%3Crect x='15' y='17' width='3' height='1' fill='%23000'/%3E%3C/svg%3E";
const LOGO_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%23FFF7EF'/%3E%3Ctext x='50' y='64' font-family='Georgia,serif' font-size='48' font-weight='900' fill='%23C8360A' text-anchor='middle'%3EQB%3C/text%3E%3C/svg%3E";

const OUTLET_PHONES = ["7225023451","9131146975","7898230733"];
const PACK = 7;
// OTP handled by Firebase Phone Auth

const INITIAL_ITEMS = [
  { id:1, name:"Pani Puri", tag:"6 pcs", desc:"Crispy puris filled with tangy jaljeera water & spiced masala stuffing", price:20, time:"5 min", cat:"Snacks", badge:"Bestseller" },
  { id:2, name:"Chinese Bhel", tag:null, desc:"Crispy fried noodles tossed in spicy sauces, crunchy veggies & sev", price:60, time:"8 min", cat:"Snacks", badge:"Popular" },
  { id:3, name:"Chowmein", tag:"plate", desc:"Wok-tossed hakka noodles with crunchy vegetables in smoky sauce", price:60, time:"10 min", cat:"Snacks", badge:null },
  { id:4, name:"Veg Aloo Burger", tag:null, desc:"Golden crispy aloo patty, fresh lettuce, tomato & signature chutney", price:50, time:"7 min", cat:"Burgers", badge:null },
  { id:5, name:"Cheese Burger", tag:null, desc:"Loaded with melted cheese, lettuce, tomato & smoky chilli sauce", price:70, time:"8 min", cat:"Burgers", badge:"Popular" },
  { id:6, name:"Double Patty Cheese Burger", tag:null, desc:"Double aloo patties, extra cheese pull & our legendary secret sauce", price:90, time:"10 min", cat:"Burgers", badge:"Bestseller" },
];

const C = {
  pri:"#C8360A", amb:"#F5921C", bg:"#FFF7EF", dark:"#1B0800",
  text:"#2C1407", muted:"#967560", grn:"#2E7D32", bdr:"rgba(200,54,10,0.12)",
  red:"#C62828",
};

const isOpen = () => { const n=new Date(),t=n.getHours()*60+n.getMinutes(); return t>=17*60+45&&t<20*60; };
const fmt = s => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,"0")}`;
const genId = () => "QB" + Date.now().toString().slice(-6);

// ─── Standalone components (outside App to prevent remount on re-render) ────

function VegDot() {
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:3,border:`1.5px solid ${C.grn}`,borderRadius:3,padding:"1px 5px",fontSize:10,color:C.grn,fontWeight:700}}>
      <span style={{width:7,height:7,background:C.grn,borderRadius:"50%",display:"inline-block"}}/>VEG
    </span>
  );
}

function InvoiceModal({ order, onClose }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:380,maxHeight:"88vh",overflowY:"auto"}}>
        <div style={{background:`linear-gradient(135deg,${C.pri},${C.amb})`,padding:"20px 20px 14px",borderRadius:"16px 16px 0 0",textAlign:"center"}}>
          <img src={LOGO_IMG} alt="QB" style={{height:44,width:44,objectFit:"contain",borderRadius:8,marginBottom:6}}/>
          <div style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:900,color:"white"}}>QuickBites</div>
          <div style={{color:"rgba(255,255,255,0.7)",fontSize:10,letterSpacing:1}}>100% HYGIENIC AND FRESH</div>
        </div>
        <div style={{padding:"0 18px 4px",background:"#f9f4ef"}}>
          <div style={{textAlign:"center",padding:"10px 0",borderBottom:`2px dashed ${C.bdr}`}}>
            <span style={{fontSize:12,fontWeight:800,color:C.pri,letterSpacing:2}}>TAX INVOICE</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${C.bdr}`,fontSize:11}}>
            <div><span style={{color:C.muted}}>Invoice #</span><br/><b>{order.id}</b></div>
            <div style={{textAlign:"right"}}><span style={{color:C.muted}}>Date</span><br/><b>{order.timestamp}</b></div>
          </div>
          <div style={{padding:"7px 0",borderBottom:`1px solid ${C.bdr}`,fontSize:11}}>
            <span style={{color:C.muted}}>Bill To: </span><b>{order.name}</b> · +91 {order.phone}
          </div>
          <table style={{width:"100%",fontSize:12,borderCollapse:"collapse",margin:"9px 0"}}>
            <thead>
              <tr style={{borderBottom:`2px solid ${C.pri}`}}>
                <th style={{textAlign:"left",padding:"5px 0",color:C.muted,fontWeight:600}}>Item</th>
                <th style={{textAlign:"center",padding:"5px 0",color:C.muted,fontWeight:600}}>Qty</th>
                <th style={{textAlign:"right",padding:"5px 0",color:C.muted,fontWeight:600}}>Amt</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map(i=>(
                <tr key={i.id} style={{borderBottom:"1px solid #f0e8e0"}}>
                  <td style={{padding:"6px 0",color:C.text,fontSize:11}}>{i.name}{i.tag?` (${i.tag})`:""}</td>
                  <td style={{textAlign:"center",padding:"6px 0",color:C.muted}}>×{i.qty}</td>
                  <td style={{textAlign:"right",padding:"6px 0",fontWeight:700}}>₹{i.price*i.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{borderTop:`2px dashed ${C.bdr}`,paddingTop:8}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:C.muted}}>Subtotal</span><span>₹{order.subtotal}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:8}}><span style={{color:C.muted}}>Packaging</span><span>₹{PACK}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontWeight:900,fontSize:15,borderTop:`2px solid ${C.pri}`,paddingTop:8}}>
              <span>GRAND TOTAL</span><span style={{color:C.pri}}>₹{order.total}</span>
            </div>
          </div>
          <div style={{padding:"9px 0",fontSize:11,textAlign:"center",color:C.muted,borderTop:`1px dashed ${C.bdr}`,marginTop:8}}>
            <div>Payment: <b>{order.payMethod==="upi"?"UPI / PhonePe":"Cash at Counter"}</b></div>
            <div style={{marginTop:3}}>Thank you for choosing QuickBites! 🌿</div>
          </div>
        </div>
        <div style={{padding:"12px 16px"}}>
          <button onClick={onClose} style={{width:"100%",background:`linear-gradient(135deg,${C.pri},${C.amb})`,border:"none",borderRadius:12,padding:12,color:"white",fontWeight:800,fontSize:14,cursor:"pointer"}}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function QuickBites() {
  const [menuItems, setMenuItems] = useState(INITIAL_ITEMS);
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState(() => Object.fromEntries(INITIAL_ITEMS.map(i=>[i.id,true])));

  // Auth
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginType, setLoginType] = useState(null);
  const [userPhone, setUserPhone] = useState("");
  const [userName, setUserName] = useState("");

  // Login form fields — kept in top-level state to survive re-renders
  const [loginMode, setLoginMode] = useState(null); // "customer" | "outlet"
  const [lPhone, setLPhone] = useState("");
  const [lOtp, setLOtp] = useState("");
  const [lName, setLName] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Customer screens
  const [custScreen, setCustScreen] = useState("menu");
  const [cart, setCart] = useState({});
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [payMethod, setPayMethod] = useState("");
  const [upiPaid, setUpiPaid] = useState(false);
  const [custCat, setCustCat] = useState("All");

  // Outlet
  const [outletTab, setOutletTab] = useState("orders");
  // WhatsApp Business API config
  // Add-item form
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCat, setNewCat] = useState("Snacks");
  const [newDesc, setNewDesc] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newBadge, setNewBadge] = useState("");
  const [newImg, setNewImg] = useState("");
  const [newCustomCat, setNewCustomCat] = useState("");
  // Per-customer persistent history
  const [myHistory, setMyHistory] = useState([]);
  // Promo codes (shared storage)
  const [promoCodes, setPromoCodes] = useState([]);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  // Promo creation form
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState("");
  const [promoUsage, setPromoUsage] = useState("");
  const [promoExpiry, setPromoExpiry] = useState("");
  // Ratings view in outlet
  const [viewRatingsOrder, setViewRatingsOrder] = useState(null);
  const [selectedDoneOrder, setSelectedDoneOrder] = useState(null);
  // Edit item state
  const [editItem, setEditItem] = useState(null); // item being edited
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editTag, setEditTag] = useState("");
  const [editBadge, setEditBadge] = useState("");
  const [editImg, setEditImg] = useState("");
  const [editCat, setEditCat] = useState("");

  // UI
  const [toast, setToast] = useState("");
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [showRating, setShowRating] = useState(false);
  const [stars, setStars] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([{r:"bot",t:"Hi! I'm *QB-Bito* 🍔 — your QuickBites helper! Ask me about the menu, prices, promos, or your order 😊"}]);
  const [chatIn, setChatIn] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const chatBottom = useRef();

  const [secs, setSecs] = useState(25*60);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const tRef = useRef();

  const showToast = useCallback((m, d=3000) => {
    setToast(m);
    setTimeout(()=>setToast(""),d);
  }, []);

  const confirmLogout = () => setShowLogoutConfirm(true);

  const doLogout = () => {
    setShowLogoutConfirm(false);
    setLoggedIn(false); setLoginType(null); setUserPhone(""); setUserName("");
    setLPhone(""); setLOtp(""); setLName(""); setOtpSent(false); setLoginMode(null);
    setCart({}); setCustScreen("menu"); setActiveOrderId(null); setPayMethod(""); setCustCat("All");
    setOutletTab("orders"); setShowRating(false); setStars(0); setFeedback(""); setSecs(25*60); setMyHistory([]); setAppliedPromo(null); setPromoInput("");
  };

  // Keep orders & inventory in shared storage so customer+outlet stay in sync
  const syncMenuToStorage = async (updatedMenu) => {
    try { await writeShared("menu", { list: updatedMenu }); } catch(e) { console.warn("Menu sync failed:", e); }
  };

  const syncOrdersToStorage = async (updatedOrders) => {
    try { await writeShared("orders", { list: updatedOrders }); } catch(e) { console.warn("Order sync failed:", e); }
  };
  const syncInventoryToStorage = async (updatedInventory) => {
    try { await writeShared("inventory", { data: updatedInventory }); } catch(e) { console.warn("Inv sync failed:", e); }
  };

  // Cart
  const addItem = id => setCart(c=>({...c,[id]:(c[id]||0)+1}));
  const subItem = id => setCart(c=>{const n={...c};n[id]>1?n[id]--:delete n[id];return n;});
  const cartItems = Object.entries(cart).map(([id,qty])=>({...menuItems.find(i=>i.id===+id),qty}));
  const subtotal = cartItems.reduce((s,i)=>s+i.price*i.qty,0);
  const promoDiscount2 = appliedPromo ? Math.round((subtotal+PACK) * appliedPromo.discount / 100) : 0;
  const grandTotal = subtotal+PACK - promoDiscount2;
  const cartCount = Object.values(cart).reduce((s,v)=>s+v,0);

  const allCats = ["All",...[...new Set(menuItems.map(i=>i.cat))]];
  const filtered = custCat==="All" ? menuItems : menuItems.filter(i=>i.cat===custCat);

  const sendOtp = async () => {
    if (lPhone.length !== 10) { showToast("Enter a valid 10-digit number"); return; }
    if (loginMode === "outlet" && !OUTLET_PHONES.includes(lPhone)) {
      showToast("❌ Unauthorized number. Access denied."); return;
    }
    try {
      showToast("Sending OTP...");
      await sendOTPToPhone(lPhone);
      setOtpSent(true);
      showToast(`✓ OTP sent to +91 ${lPhone}`);
    } catch(e) {
      showToast("Failed to send OTP. Try again.");
      console.error(e);
    }
  };

  const handleLogin = async () => {
    if (!otpSent) { showToast("Send OTP first"); return; }
    if (loginMode === "customer" && !lName.trim()) { showToast("Enter your name"); return; }
    try {
      showToast("Verifying OTP...");
      await verifyOTP(lOtp);
      setLoggedIn(true); setLoginType(loginMode);
      setUserPhone(lPhone); setUserName(loginMode==="customer" ? lName : "Owner");
      showToast(`Welcome${loginMode==="customer"?" "+lName:""}! 👋`);
      // Load customer history from Firestore
      if (loginMode==="customer") {
        try {
          const data = await readUserDoc(lPhone, "history");
          if (data?.orders && Array.isArray(data.orders)) setMyHistory(data.orders);
        } catch(e) {}
      }
    } catch(e) {
      showToast("Wrong OTP. Please try again.");
      console.error(e);
    }
  };

    const sendBito = async (q, history) => {
    setChatBusy(true);
    setTimeout(()=>chatBottom.current?.scrollIntoView({behavior:"smooth"}),50);
    const inStock = menuItems.filter(i=>inventory[i.id]).map(i=>`${i.name} ₹${i.price}`).join(", ");
    const outStock = menuItems.filter(i=>!inventory[i.id]).map(i=>i.name).join(", ")||"none";
    const promos = promoCodes.filter(p=>p.active).map(p=>`${p.code} ${p.discount}% off`).join(", ")||"none";
    const lastOrder = myHistory[0] ? `Last order: ${myHistory[0].items.map(i=>i.name).join(", ")} ₹${myHistory[0].total} (${myHistory[0].status})` : "no orders yet";
    const sys = `You are QB-Bito 🍔, a cute friendly AI for QuickBites pure veg food stall. Be warm, short (2-3 sentences), use emoji. Only answer QuickBites questions.
Menu: ${inStock}. Out of stock: ${outStock}. Active promos: ${promos}. Timings: 5:45-8:00 PM. Payment: UPI PhonePe (rupam panday) or Cash. Wait: ~25 mins. ${lastOrder}. Use * for bold.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:200,system:sys,messages:history.slice(-6).map(m=>({role:m.r==="user"?"user":"assistant",content:m.t.replace(/[*]/g,"")}))})})
      const d = await res.json();
      setChatMsgs(p=>[...p,{r:"bot",t:d?.content?.[0]?.text||"Oops! Try again 😅"}]);
    } catch(e) {
      setChatMsgs(p=>[...p,{r:"bot",t:"Can't reach server right now 😕 Try again!"}]);
    }
    setChatBusy(false);
    setTimeout(()=>chatBottom.current?.scrollIntoView({behavior:"smooth"}),80);
  };

    const placeOrder = () => {
    const id = genId();
    const order = {
      id, phone:userPhone, name:userName, items:cartItems,
      subtotal, total:grandTotal, payMethod, status:"pending",
      timestamp: new Date().toLocaleString("en-IN"),
    };
    const updatedOrders = [...orders, order];
    setOrders(updatedOrders);
    syncOrdersToStorage(updatedOrders);
    setActiveOrderId(id);
    // Save to this customer's personal history
    const updatedHistory = [order, ...myHistory];
    setMyHistory(updatedHistory);
    writeUserDoc(userPhone, "history", { orders: updatedHistory }).catch(()=>{});
    setCart({});
    setCustScreen("tracking");
    setSecs(25*60);
    setAppliedPromo(null); setPromoInput("");
    showToast("🚀 Order placed! Waiting for outlet...", 4000);
    try { AudioEngine.placed(); } catch(e){}

  };

  const outletAction = (orderId, action) => {
    const updatedOrders = orders.map(o=>o.id===orderId?{...o,status:action}:o);
    setOrders(updatedOrders);
    syncOrdersToStorage(updatedOrders);
    // Also persist final status to that customer's personal history key
    const targetOrder = orders.find(o=>o.id===orderId);
    if (targetOrder && (action==="ready"||action==="rejected")) {
      readUserDoc(targetOrder.phone, "history").then(data => {
        const hist = data?.orders || [];
        const updated = hist.map(o=>o.id===orderId?{...o,status:action}:o);
        writeUserDoc(targetOrder.phone, "history", { orders: updated }).catch(()=>{});
      }).catch(()=>{});
    }
    const statusMsgs = {accepted:"✓ Order accepted!",rejected:"✗ Order rejected",almost:"⚡ Marked almost ready",ready:"🎉 Order marked ready!"};
    showToast(statusMsgs[action]||"Updated");
    try { AudioEngine[action]?.(); } catch(e){}
    // Send WhatsApp to customer from outlet device
    const order = orders.find(o=>o.id===orderId);
    if (order) {
      const waTexts = {
        accepted: `✅ *Order Accepted — QuickBites*%0A━━━━━━━━━━━━━━━━━━━━%0AHey *${order.name}*! 👋%0AYour order *%23${order.id}* has been accepted.%0A👨‍🍳 Chef is now preparing your food fresh!%0A━━━━━━━━━━━━━━━━━━━━%0A⏱ Est. ready in *20–25 mins*%0AWe will notify you when ready! 🔔%0A%0A_QuickBites — 100% Hygienic %26 Fresh 🌿_`,
        almost:   `⚡ *Almost Ready — QuickBites*%0A━━━━━━━━━━━━━━━━━━━━%0AHey *${order.name}*! 🙌%0AYour order *%23${order.id}* is almost done!%0A🍳 Finishing the final touches...%0A━━━━━━━━━━━━━━━━━━━━%0A📍 Please start heading to the counter!%0A%0A_QuickBites — 100% Hygienic %26 Fresh 🌿_`,
        ready:    `🎉 *Order Ready — QuickBites*%0A━━━━━━━━━━━━━━━━━━━━%0AHey *${order.name}*! Your food is ready! 🍔🔥%0AOrder *%23${order.id}* — Come pick it up!%0A━━━━━━━━━━━━━━━━━━━━%0A📍 *Counter Pickup* — Collect now%0A💳 ${order.payMethod==="upi"?"UPI / PhonePe ✅":"Cash at Counter 💵"}%0A*Total: ₹${order.total}*%0A━━━━━━━━━━━━━━━━━━━━%0AThank you for choosing QuickBites! 😊%0A%0A_QuickBites — 100% Hygienic %26 Fresh 🌿_`,
        rejected: `❌ *Order Update — QuickBites*%0A━━━━━━━━━━━━━━━━━━━━%0AHey *${order.name}*, we're sorry!%0AYour order *%23${order.id}* could not be processed.%0A━━━━━━━━━━━━━━━━━━━━%0APlease place a new order or visit the counter.%0AApologies for the inconvenience 🙏%0A%0A_QuickBites — 100% Hygienic %26 Fresh 🌿_`,
      };
      if (["accepted","rejected","ready"].includes(action) && waTexts[action]) {
        setTimeout(() => {
          window.open(`https://wa.me/91${order.phone}?text=${waTexts[action]}`, "_blank");
        }, 600);
      }
    }
  };

  const toggleStock = id => {
    const updatedInv = {...inventory,[id]:!inventory[id]};
    setInventory(updatedInv);
    syncInventoryToStorage(updatedInv);
    const item = menuItems.find(i=>i.id===id);
    showToast(`${item.name} ${inventory[id]?"marked out of stock":"restocked"}`);
  };

  const openEditItem = (item) => {
    setEditItem(item);
    setEditName(item.name);
    setEditPrice(String(item.price));
    setEditDesc(item.desc);
    setEditTag(item.tag||"");
    setEditBadge(item.badge||"");
    setEditImg(item.img||"");
    setEditCat(item.cat);
    setOutletTab("edit");
  };

  const saveEditItem = () => {
    if (!editName.trim()) { showToast("Name can't be empty"); return; }
    if (!editPrice || isNaN(+editPrice) || +editPrice<=0) { showToast("Enter valid price"); return; }
    const updated = menuItems.map(i=>i.id===editItem.id?{
      ...i,
      name: editName.trim(),
      price: +editPrice,
      desc: editDesc.trim(),
      tag: editTag.trim()||null,
      badge: editBadge||null,
      img: editImg||null,
      cat: editCat,
    }:i);
    setMenuItems(updated);
    syncMenuToStorage(updated);
    showToast(`✅ "${editName}" updated!`);
    setEditItem(null);
    setOutletTab("inventory");
  };

  const addNewItem = () => {
    if (!newName.trim()) { showToast("Enter item name"); return; }
    if (!newPrice || isNaN(+newPrice) || +newPrice<=0) { showToast("Enter valid price"); return; }
    if (!newDesc.trim()) { showToast("Enter description"); return; }
    const finalCat = newCat==="__new__" ? (newCustomCat.trim()||"Other") : newCat;
    if (newCat==="__new__" && !newCustomCat.trim()) { showToast("Enter a category name"); return; }
    const newId = Date.now();
    const item = {
      id: newId, name: newName.trim(), tag: newTag.trim()||null,
      desc: newDesc.trim(), price: +newPrice, time: "10 min",
      cat: finalCat, badge: newBadge||null, img: newImg||null,
    };
    const updatedMenu = [...menuItems, item];
    const updatedInv  = {...inventory, [newId]: true};
    setMenuItems(updatedMenu);
    setInventory(updatedInv);
    syncMenuToStorage(updatedMenu);
    syncInventoryToStorage(updatedInv);
    setNewName(""); setNewPrice(""); setNewDesc(""); setNewTag(""); setNewBadge(""); setNewImg(""); setNewCat("Snacks"); setNewCustomCat("");
    showToast(`✅ "${item.name}" added to menu!`);
  };

  // Tracking timer
  // ── Shared storage sync ──────────────────────────────────────────────────
  // Load orders from shared storage on first mount
  useEffect(() => {
    const loadFromStorage = async () => {
      try {
        const res = await null // migrated to Firestore;
        if (res && res.value) {
          const stored = JSON.parse(res.value);
          if (Array.isArray(stored) && stored.length > 0) setOrders(stored);
        }
      } catch(e) {}
      try {
        const invRes = await null // migrated to Firestore;
        if (invRes && invRes.value) {
          const storedInv = JSON.parse(invRes.value);
          if (storedInv && typeof storedInv === "object") setInventory(storedInv);
        }
      } catch(e) {}
    };
    loadFromStorage();
  }, []);

 // empty deps is safe now — setOrders/setInventory use functional updates

  useEffect(() => {
    if (custScreen !== "tracking") return;
    const activeOrder = orders.find(o=>o.id===activeOrderId);
    if (!activeOrder || activeOrder.status==="ready") { clearInterval(tRef.current); return; }
    tRef.current = setInterval(()=>setSecs(s=>s>0?s-1:0), 1000);
    return ()=>clearInterval(tRef.current);
  }, [custScreen, activeOrderId, orders]);

  const activeOrder = orders.find(o=>o.id===activeOrderId);
  const trackStatus = activeOrder?.status||"pending";
  const stepIdx = {pending:0,accepted:1,almost:2,ready:3}[trackStatus]??0;
  const TRACK_STEPS = [
    {key:"pending",icon:"📋",label:"Order Received",sub:"Sent to outlet"},
    {key:"accepted",icon:"👨‍🍳",label:"Preparing",sub:"Being freshly made"},
    {key:"almost",icon:"⚡",label:"Almost Ready",sub:"Finishing up"},
    {key:"ready",icon:"🎉",label:"Ready for Pickup!",sub:"Come collect it!"},
  ];

  // ── Input style helper ────────────────────────────────────────────────────
  const inp = (extra={}) => ({
    width:"100%", padding:"11px 13px", borderRadius:12,
    border:`1.5px solid ${C.bdr}`, fontSize:14, outline:"none",
    fontFamily:"inherit", color:C.text, background:"white",
    boxSizing:"border-box", ...extra
  });

  // ── Shared NavBar ─────────────────────────────────────────────────────────
  const NavBar = ({title, onBack}) => (
    <div style={{background:"linear-gradient(155deg,#1B0800,#3D1507)",padding:"14px 14px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,zIndex:10}}>
      {onBack&&<button onClick={onBack} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:10,width:34,height:34,cursor:"pointer",color:"white",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>←</button>}
      <img src={LOGO_IMG} alt="QB" style={{height:30,width:30,objectFit:"contain",borderRadius:6,flexShrink:0}}/>
      <span style={{fontFamily:"Georgia,serif",fontSize:17,fontWeight:900,color:"white",flex:1}}>{title}</span>
      <button onClick={confirmLogout} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:8,padding:"5px 10px",color:"rgba(255,255,255,0.55)",fontSize:11,cursor:"pointer",flexShrink:0}}>Logout</button>
    </div>
  );

  // ── QtyCtrl ───────────────────────────────────────────────────────────────
  const QtyCtrl = ({id}) => {
    const q=cart[id]||0, inStock=inventory[id];
    if (!inStock) return <span style={{fontSize:10,color:C.muted,background:"#f0e8e0",borderRadius:10,padding:"5px 8px",fontWeight:700}}>Unavailable</span>;
    return q===0?(
      <button onClick={()=>addItem(id)} style={{background:`linear-gradient(135deg,${C.pri},${C.amb})`,color:"white",border:"none",borderRadius:20,padding:"7px 14px",fontSize:13,fontWeight:800,cursor:"pointer",boxShadow:"0 3px 10px rgba(200,54,10,0.35)"}}>ADD</button>
    ):(
      <div style={{display:"flex",alignItems:"center",background:C.dark,borderRadius:20,overflow:"hidden"}}>
        <button onClick={()=>subItem(id)} style={{background:"none",border:"none",color:"white",padding:"6px 11px",cursor:"pointer",fontSize:17,fontWeight:700,lineHeight:1}}>−</button>
        <span style={{color:"white",fontSize:13,fontWeight:800,minWidth:18,textAlign:"center"}}>{q}</span>
        <button onClick={()=>addItem(id)} style={{background:"none",border:"none",color:C.amb,padding:"6px 11px",cursor:"pointer",fontSize:17,fontWeight:700,lineHeight:1}}>+</button>
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',sans-serif;background:#E8CEB2;}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes pop{0%{transform:scale(0);opacity:0}70%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}
        ::-webkit-scrollbar{display:none;}
        input::placeholder{color:#C0A898;}
        input:focus{border-color:rgba(200,54,10,0.5)!important;box-shadow:0 0 0 3px rgba(200,54,10,0.1)}
      `}</style>
      <div style={{background:"#E8CEB2",minHeight:"100vh",display:"flex",justifyContent:"center"}}>
        <div id="recaptcha-container"/>
        <div style={{width:"100%",maxWidth:430,minHeight:"100vh",background:C.bg,position:"relative",overflow:"hidden",fontFamily:"'DM Sans',sans-serif"}}>

          {/* ═══════════════════════ LOGIN ═══════════════════════ */}
          {!loggedIn && (
            <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
              <img src={LOGO_IMG} alt="QuickBites" style={{width:90,height:90,objectFit:"contain",marginBottom:8,borderRadius:14}}/>
              <div style={{fontFamily:"Georgia,serif",fontSize:26,fontWeight:900,color:C.dark,marginBottom:3}}>QuickBites</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:28,letterSpacing:0.5}}>100% Hygienic and Fresh</div>

              {!loginMode ? (
                <>
                  <div style={{fontSize:14,color:C.text,marginBottom:14,fontWeight:700}}>Choose login type</div>
                  <div style={{display:"flex",gap:12,width:"100%",maxWidth:300}}>
                    {[{k:"customer",icon:"🛒",label:"Customer"},{k:"outlet",icon:"🏪",label:"Outlet Owner"}].map(m=>(
                      <button key={m.k} onClick={()=>setLoginMode(m.k)} style={{flex:1,background:"white",border:`2px solid ${C.bdr}`,borderRadius:16,padding:"18px 10px",cursor:"pointer",fontSize:14,fontWeight:700,color:C.text,display:"flex",flexDirection:"column",alignItems:"center",gap:6,boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
                        <span style={{fontSize:28}}>{m.icon}</span>{m.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{width:"100%",maxWidth:320,background:"white",borderRadius:18,padding:20,boxShadow:"0 4px 20px rgba(0,0,0,0.09)"}}>
                  <div style={{fontFamily:"Georgia,serif",fontSize:15,fontWeight:900,color:C.text,marginBottom:16,textAlign:"center"}}>
                    {loginMode==="customer"?"🛒 Customer Login":"🏪 Outlet Owner Login"}
                  </div>

                  {loginMode==="customer" && (
                    <input
                      key="login-name"
                      placeholder="Your Full Name"
                      value={lName}
                      onChange={e=>setLName(e.target.value)}
                      style={{...inp(),marginBottom:10}}
                    />
                  )}

                  <div style={{display:"flex",gap:8,marginBottom:10}}>
                    <div style={{background:"#f5ede3",borderRadius:12,padding:"11px 10px",fontSize:13,color:C.muted,flexShrink:0,display:"flex",alignItems:"center"}}>+91</div>
                    <input
                      key="login-phone"
                      placeholder="Phone Number"
                      value={lPhone}
                      onChange={e=>setLPhone(e.target.value.replace(/\D/g,"").slice(0,10))}
                      maxLength={10}
                      style={{...inp(),flex:1,minWidth:0}}
                    />
                    <button
                      onClick={sendOtp}
                      disabled={lPhone.length!==10||otpSent}
                      style={{background:lPhone.length===10&&!otpSent?C.pri:"#ccc",border:"none",borderRadius:12,color:"white",padding:"0 11px",fontSize:12,fontWeight:800,cursor:lPhone.length===10&&!otpSent?"pointer":"not-allowed",flexShrink:0,whiteSpace:"nowrap"}}>
                      {otpSent?"Sent":"Get OTP"}
                    </button>
                  </div>

                  {otpSent && (
                    <input
                      key="login-otp"
                      placeholder="Enter OTP (demo: 1234)"
                      value={lOtp}
                      onChange={e=>setLOtp(e.target.value.replace(/\D/g,"").slice(0,4))}
                      maxLength={4}
                      style={{...inp(),letterSpacing:8,fontFamily:"monospace",fontSize:18,marginBottom:10,textAlign:"center"}}
                    />
                  )}

                  <button
                    onClick={handleLogin}
                    style={{width:"100%",background:otpSent?`linear-gradient(135deg,${C.pri},${C.amb})`:"#ddd",border:"none",borderRadius:12,padding:13,color:otpSent?"white":"#aaa",fontWeight:900,fontSize:14,cursor:otpSent?"pointer":"not-allowed",marginTop:4}}>
                    Login
                  </button>
                  <button onClick={()=>{setLoginMode(null);setOtpSent(false);setLPhone("");setLOtp("");setLName("");}} style={{width:"100%",background:"none",border:"none",color:C.muted,fontSize:12,marginTop:10,cursor:"pointer",padding:6}}>← Back</button>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════ CUSTOMER APP ═══════════════════════ */}
          {loggedIn && loginType==="customer" && (
            <div style={{minHeight:"100vh"}}>

              {/* MENU */}
              {custScreen==="menu" && (
                <div style={{paddingBottom:100}}>
                  <div style={{background:"linear-gradient(155deg,#1B0800,#3D1507)",padding:"14px 14px 18px",position:"sticky",top:0,zIndex:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <img src={LOGO_IMG} alt="QB" style={{height:34,width:34,objectFit:"contain",borderRadius:8}}/>
                        <div>
                          <div style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:900,color:"white",lineHeight:1}}>QuickBites</div>
                          <div style={{color:"rgba(255,255,255,0.45)",fontSize:9,letterSpacing:0.3}}>100% Hygienic and Fresh</div>
                        </div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{background:isOpen()?"rgba(46,125,50,0.2)":"rgba(198,40,40,0.2)",border:`1px solid ${isOpen()?"#66BB6A":"#EF5350"}`,borderRadius:20,padding:"3px 10px",color:isOpen()?"#A5D6A7":"#EF9A9A",fontSize:11,fontWeight:800,marginBottom:2}}>{isOpen()?"● OPEN":"● CLOSED"}</div>
                        <div style={{color:"rgba(255,255,255,0.3)",fontSize:9}}>5:45–8:00 PM</div>
                        <button onClick={confirmLogout} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:6,padding:"3px 8px",color:"rgba(255,255,255,0.5)",fontSize:10,cursor:"pointer",marginTop:3}}>Logout</button>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:7}}>
                      {[["4.8★","Rating"],["25 min","⏱ Wait"],["100%","🌿 Pure Veg"]].map(([v,l])=>(
                        <div key={l} style={{background:"rgba(255,255,255,0.07)",borderRadius:10,padding:"6px 7px",flex:1,textAlign:"center"}}>
                          <div style={{color:C.amb,fontSize:14,fontWeight:900}}>{v}</div>
                          <div style={{color:"rgba(255,255,255,0.4)",fontSize:8}}>{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{display:"flex",gap:8,padding:"10px 12px 4px",overflowX:"auto",scrollbarWidth:"none"}}>
                    {allCats.map(c=>(
                      <button key={c} onClick={()=>setCustCat(c)} style={{background:custCat===c?`linear-gradient(135deg,${C.pri},${C.amb})`:"white",color:custCat===c?"white":C.text,border:custCat===c?"none":`1px solid ${C.bdr}`,borderRadius:20,padding:"7px 15px",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,boxShadow:custCat===c?"0 4px 12px rgba(200,54,10,0.3)":"none"}}>
                        {c}
                      </button>
                    ))}
                  </div>

                  <div style={{padding:"6px 10px"}}>
                    {filtered.map(item=>(
                      <div key={item.id} style={{background:"white",borderRadius:14,marginBottom:9,overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
                        <div style={{background:!inventory[item.id]?"#eee":item.badge==="Bestseller"?"#FFF3E0":item.badge==="Popular"?"#F3E5F5":"#E8F5E9",height:4}}/>
                        <div style={{padding:"11px 12px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                            <div style={{flex:1}}>
                              <div style={{display:"flex",gap:5,marginBottom:4,flexWrap:"wrap",alignItems:"center"}}>
                                <VegDot/>
                                {item.badge&&<span style={{background:item.badge==="Bestseller"?"#BF360C":"#6A1B9A",color:"white",fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:10}}>{item.badge.toUpperCase()}</span>}
                                {!inventory[item.id]&&<span style={{background:"#f44336",color:"white",fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:10}}>OUT OF STOCK</span>}
                              </div>
                              <div style={{fontFamily:"Georgia,serif",fontSize:14,fontWeight:800,color:C.text,marginBottom:3}}>
                                {item.name}{item.tag&&<span style={{fontSize:11,color:C.muted,fontWeight:400}}> ({item.tag})</span>}
                              </div>
                              <div style={{fontSize:11,color:C.muted,lineHeight:1.45,marginBottom:6}}>{item.desc}</div>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <span style={{fontSize:15,fontWeight:900,color:C.pri}}>₹{item.price}</span>
                                <span style={{fontSize:11,color:C.muted}}>⏱ {item.time}</span>
                              </div>
                            </div>
                            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8,flexShrink:0}}>
                              {item.img&&<img src={item.img} alt={item.name} style={{width:60,height:60,borderRadius:10,objectFit:"cover",boxShadow:"0 2px 8px rgba(0,0,0,0.12)"}}/>}
                              <QtyCtrl id={item.id}/>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{padding:"0 10px 10px"}}>
                    <button onClick={()=>setCustScreen("history")} style={{width:"100%",background:"white",border:`1.5px solid ${C.bdr}`,borderRadius:12,padding:12,color:C.text,fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>📋 My Order History{myHistory.length>0&&<span style={{background:C.pri,color:"white",borderRadius:10,padding:"2px 8px",fontSize:11,fontWeight:900}}>{myHistory.length}</span>}</button>
                  </div>

                  {cartCount>0&&(
                    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,padding:"8px 10px 14px",background:"linear-gradient(to top,rgba(255,247,239,1) 60%,transparent)",zIndex:50}}>
                      <button onClick={()=>setCustScreen("cart")} style={{width:"100%",background:`linear-gradient(135deg,${C.pri},${C.amb})`,border:"none",borderRadius:14,padding:"13px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",boxShadow:"0 8px 20px rgba(200,54,10,0.4)"}}>
                        <span style={{background:"rgba(255,255,255,0.2)",borderRadius:10,padding:"3px 10px",color:"white",fontWeight:900,fontSize:13}}>{cartCount}</span>
                        <span style={{color:"white",fontWeight:700,fontSize:14}}>View Cart</span>
                        <span style={{color:"white",fontWeight:900,fontSize:14}}>₹{subtotal} →</span>
                      </button>
                    </div>
                  )}
                </div>
              )}


              {/* CART */}
              {custScreen==="cart" && (
                <div style={{display:"flex",flexDirection:"column",minHeight:"100vh"}}>
                  <NavBar title="Your Cart" onBack={()=>setCustScreen("menu")}/>
                  <div style={{flex:1,overflowY:"auto",padding:"10px 10px 0"}}>
                    {cartItems.map(item=>(
                      <div key={item.id} style={{background:"white",borderRadius:12,padding:"11px 12px",marginBottom:8,display:"flex",alignItems:"center",gap:10,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
                        <div style={{flex:1}}>
                          <div style={{fontFamily:"Georgia,serif",fontSize:13,fontWeight:800,color:C.text}}>{item.name}</div>
                          <div style={{fontSize:11,color:C.muted}}>₹{item.price} each</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",background:C.dark,borderRadius:20,overflow:"hidden",flexShrink:0}}>
                          <button onClick={()=>subItem(item.id)} style={{background:"none",border:"none",color:"white",padding:"6px 10px",cursor:"pointer",fontSize:16,fontWeight:700,lineHeight:1}}>−</button>
                          <span style={{color:"white",fontSize:13,fontWeight:900,minWidth:16,textAlign:"center"}}>{item.qty}</span>
                          <button onClick={()=>addItem(item.id)} style={{background:"none",border:"none",color:C.amb,padding:"6px 10px",cursor:"pointer",fontSize:16,fontWeight:700,lineHeight:1}}>+</button>
                        </div>
                        <div style={{fontSize:14,fontWeight:900,color:C.pri,minWidth:40,textAlign:"right",flexShrink:0}}>₹{item.price*item.qty}</div>
                      </div>
                    ))}
                    <div style={{background:"white",borderRadius:14,padding:13,marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
                      <div style={{fontFamily:"Georgia,serif",fontSize:14,fontWeight:900,color:C.text,marginBottom:9}}>Bill Summary</div>
                      {[["Items Total",`₹${subtotal}`],["Packaging Fee",`₹${PACK}`]].map(([k,v])=>(
                        <div key={k} style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:12}}><span style={{color:C.muted}}>{k}</span><span>{v}</span></div>
                      ))}
                      <div style={{borderTop:`2px dashed rgba(200,54,10,0.2)`,paddingTop:9,display:"flex",justifyContent:"space-between"}}>
                        <span style={{fontWeight:900,fontSize:14}}>Grand Total</span><span style={{fontWeight:900,fontSize:16,color:C.pri}}>₹{grandTotal}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{padding:"8px 10px 14px"}}>
                    <button onClick={()=>setCustScreen("payment")} style={{width:"100%",background:`linear-gradient(135deg,${C.pri},${C.amb})`,border:"none",borderRadius:14,padding:14,color:"white",fontSize:14,fontWeight:900,cursor:"pointer",boxShadow:"0 8px 20px rgba(200,54,10,0.4)"}}>
                      Proceed to Payment · ₹{grandTotal}
                    </button>
                  </div>
                </div>
              )}

              {/* PAYMENT */}
              {custScreen==="payment" && (
                <div style={{display:"flex",flexDirection:"column",minHeight:"100vh"}}>
                  <NavBar title="Payment" onBack={()=>setCustScreen("cart")}/>
                  <div style={{flex:1,overflowY:"auto",padding:"10px 10px 0"}}>
                    <div style={{background:"white",borderRadius:14,padding:14,marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
                      <div style={{fontFamily:"Georgia,serif",fontSize:14,fontWeight:900,color:C.text,marginBottom:10}}>Choose Payment</div>
                      {[{id:"upi",label:"UPI / PhonePe",icon:"📱",sub:"Scan & pay instantly"},{id:"cash",label:"Cash at Counter",icon:"💵",sub:"Pay when you pick up"}].map(m=>(
                        <div key={m.id} onClick={()=>{setPayMethod(m.id);setUpiPaid(false);}} style={{border:`2px solid ${payMethod===m.id?C.pri:C.bdr}`,borderRadius:12,padding:"12px 12px",cursor:"pointer",background:payMethod===m.id?"rgba(200,54,10,0.04)":"white",display:"flex",alignItems:"center",gap:12,marginBottom:9,transition:"all 0.2s"}}>
                          <span style={{fontSize:24}}>{m.icon}</span>
                          <div style={{flex:1}}><div style={{fontWeight:700,color:C.text,fontSize:13}}>{m.label}</div><div style={{fontSize:11,color:C.muted}}>{m.sub}</div></div>
                          <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${payMethod===m.id?C.pri:"#ddd"}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {payMethod===m.id&&<div style={{width:9,height:9,borderRadius:"50%",background:C.pri}}/>}
                          </div>
                        </div>
                      ))}
                      {payMethod==="upi"&&(
                        <div style={{background:"#f9f4ef",borderRadius:12,padding:14,textAlign:"center",marginTop:4}}>
                          <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Scan to pay · ₹{grandTotal}</div>
                          <img src={QR_IMG} alt="PhonePe QR" style={{width:160,height:"auto",borderRadius:10,display:"block",margin:"0 auto 8px"}}/>
                          <div style={{fontWeight:900,color:C.pri,fontSize:12,marginBottom:10}}>rupam panday · PhonePe</div>
                          <button
                            onClick={()=>{
                              const a = document.createElement("a");
                              a.href = QR_IMG;
                              a.download = "QuickBites-PhonePe-QR.jpg";
                              a.click();
                            }}
                            style={{display:"inline-flex",alignItems:"center",gap:6,background:`linear-gradient(135deg,${C.pri},${C.amb})`,border:"none",borderRadius:10,padding:"8px 16px",color:"white",fontWeight:800,fontSize:12,cursor:"pointer",marginBottom:10,boxShadow:"0 3px 10px rgba(200,54,10,0.3)"}}>
                            ⬇️ Download QR Code
                          </button>
                          <div style={{background:"rgba(200,54,10,0.07)",border:`1px solid rgba(200,54,10,0.18)`,borderRadius:10,padding:"8px 11px",marginBottom:10,display:"flex",alignItems:"flex-start",gap:7}}><span style={{fontSize:13,flexShrink:0}}>ℹ️</span><span style={{fontSize:10,color:C.text,lineHeight:1.5}}>Payment will be <b>verified by the outlet</b>. If payment is not received, your order will be <b style={{color:C.red}}>rejected</b>.</span></div>
                          {/* Payment confirmation tap */}
                          <div
                            onClick={()=>{ setUpiPaid(!upiPaid); if(!upiPaid) { try{AudioEngine.accepted();}catch(e){} } }}
                            style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",borderRadius:12,border:`2px solid ${upiPaid?C.grn:C.bdr}`,background:upiPaid?"rgba(46,125,50,0.07)":"white",cursor:"pointer",transition:"all 0.25s",userSelect:"none",marginTop:4}}>
                            <div style={{width:34,height:34,borderRadius:10,background:upiPaid?`linear-gradient(135deg,${C.grn},#388E3C)`:"#f0e8e0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,transition:"all 0.25s",boxShadow:upiPaid?"0 3px 10px rgba(46,125,50,0.3)":"none"}}>
                              {upiPaid?"✅":"💳"}
                            </div>
                            <div style={{flex:1,textAlign:"left"}}>
                              <div style={{fontSize:13,fontWeight:800,color:upiPaid?C.grn:C.text}}>{upiPaid?"Payment Done!":"Tap after paying"}</div>
                              <div style={{fontSize:10,color:C.muted,marginTop:1}}>{upiPaid?"Outlet will verify & confirm":"Scan QR above → pay → tap here"}</div>
                            </div>
                            <div style={{width:22,height:22,borderRadius:6,border:`2.5px solid ${upiPaid?C.grn:"#ccc"}`,background:upiPaid?C.grn:"white",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.25s",flexShrink:0}}>
                              {upiPaid&&<span style={{color:"white",fontSize:13,fontWeight:900,lineHeight:1}}>✓</span>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Promo code */}
                    <div style={{background:"white",borderRadius:14,padding:"13px 14px",marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
                      <div style={{fontFamily:"Georgia,serif",fontSize:13,fontWeight:900,color:C.text,marginBottom:10}}>🎟️ Promo Code</div>
                      {appliedPromo ? (
                        <div style={{display:"flex",alignItems:"center",gap:10,background:"rgba(46,125,50,0.07)",border:`1.5px solid ${C.grn}`,borderRadius:12,padding:"10px 13px"}}>
                          <span style={{fontSize:18}}>✅</span>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:800,color:C.grn,fontSize:13}}>{appliedPromo.code} — {appliedPromo.discount}% OFF</div>
                            <div style={{fontSize:11,color:C.muted}}>You save ₹{promoDiscount2}!</div>
                          </div>
                          <button onClick={()=>setAppliedPromo(null)} style={{background:"none",border:"none",color:C.red,fontWeight:800,fontSize:12,cursor:"pointer"}}>Remove</button>
                        </div>
                      ) : (
                        <div style={{display:"flex",gap:8}}>
                          <input
                            key="promo-input"
                            placeholder="Enter promo code"
                            value={promoInput}
                            onChange={e=>setPromoInput(e.target.value.toUpperCase())}
                            style={{flex:1,padding:"10px 13px",borderRadius:12,border:`1.5px solid ${C.bdr}`,fontSize:13,outline:"none",fontFamily:"monospace",letterSpacing:1,color:C.text,background:"#fafaf8",minWidth:0,boxSizing:"border-box"}}
                          />
                          <button onClick={()=>{
                            const today = new Date().toISOString().split("T")[0];
                            const found = promoCodes.find(p=>
                              p.code===promoInput.trim() &&
                              p.active &&
                              (p.expiry===""||p.expiry>=today) &&
                              (p.usageLimit===""||p.usedCount<+p.usageLimit)
                            );
                            if (found) {
                              setAppliedPromo(found);
                              // increment usedCount in shared storage
                              const updated = promoCodes.map(p=>p.code===found.code?{...p,usedCount:(p.usedCount||0)+1}:p);
                              setPromoCodes(updated);
                              writeShared("promos", { list: updated }).catch(()=>{});
                              showToast(`🎉 ${found.discount}% discount applied!`, 3000);
                            } else {
                              showToast("❌ Invalid or expired promo code", 3000);
                            }
                          }} style={{background:`linear-gradient(135deg,${C.pri},${C.amb})`,border:"none",borderRadius:12,color:"white",fontWeight:800,fontSize:12,padding:"0 14px",cursor:"pointer",flexShrink:0}}>Apply</button>
                        </div>
                      )}
                    </div>
                    {/* Bill summary */}
                    <div style={{background:"white",borderRadius:14,padding:13,marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}><span style={{color:C.muted}}>Items</span><span>₹{subtotal}</span></div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}><span style={{color:C.muted}}>Packaging</span><span>₹{PACK}</span></div>
                      {appliedPromo&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}><span style={{color:C.grn,fontWeight:700}}>Promo ({appliedPromo.code})</span><span style={{color:C.grn,fontWeight:700}}>−₹{promoDiscount2}</span></div>}
                      <div style={{borderTop:`2px dashed rgba(200,54,10,0.2)`,paddingTop:9,display:"flex",justifyContent:"space-between"}}>
                        <span style={{fontWeight:900,fontSize:14}}>Grand Total</span><span style={{fontWeight:900,fontSize:16,color:C.pri}}>₹{grandTotal}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{padding:"8px 10px 14px"}}>
                    <button
                      onClick={(payMethod==="cash"||(payMethod==="upi"&&upiPaid))?placeOrder:undefined}
                      style={{width:"100%",background:(payMethod==="cash"||(payMethod==="upi"&&upiPaid))?`linear-gradient(135deg,${C.pri},${C.amb})`:"#ddd",border:"none",borderRadius:14,padding:14,color:(payMethod==="cash"||(payMethod==="upi"&&upiPaid))?"white":"#aaa",fontSize:14,fontWeight:900,cursor:(payMethod==="cash"||(payMethod==="upi"&&upiPaid))?"pointer":"not-allowed",boxShadow:(payMethod==="cash"||(payMethod==="upi"&&upiPaid))?"0 8px 20px rgba(200,54,10,0.4)":"none",transition:"all 0.3s"}}>
                      {payMethod==="upi"&&!upiPaid?"💳 Confirm Payment Above":payMethod?`🚀 Place Order · ₹${grandTotal}`:"Select payment method"}
                    </button>
                  </div>
                </div>
              )}

              {/* TRACKING */}
              {custScreen==="tracking" && activeOrder && (
                <div style={{display:"flex",flexDirection:"column",minHeight:"100vh"}}>
                  <NavBar title="Order Tracking"/>
                  <div style={{flex:1,overflowY:"auto",padding:10}}>
                    <div style={{background:"white",borderRadius:18,padding:"16px 14px",marginBottom:12,textAlign:"center",boxShadow:"0 4px 16px rgba(0,0,0,0.07)"}}>
                      {trackStatus==="ready"?(
                        <div>
                          <div style={{fontSize:60,marginBottom:8}}>🎉</div>
                          {["🍔","🌟","✨","🎊","🔥"].map((e,i)=><span key={i} style={{fontSize:22,display:"inline-block",animation:`pop 0.5s ${i*0.1}s both`}}>{e}</span>)}
                          <div style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:900,color:C.text,marginTop:10,marginBottom:5}}>Order is Ready!</div>
                          <div style={{color:C.muted,fontSize:13,marginBottom:12}}>Head to the counter to pick it up</div>
                          <div style={{display:"inline-block",padding:"10px 20px",background:`linear-gradient(135deg,${C.pri},${C.amb})`,borderRadius:12,color:"white",fontSize:14,fontWeight:900}}>📍 Counter Pickup</div>
                        </div>
                      ):trackStatus==="rejected"?(
                        <div style={{textAlign:"center",padding:"8px 0"}}>
                          <div style={{fontSize:56,marginBottom:10}}>❌</div>
                          <div style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:900,color:C.red,marginBottom:8}}>Order Rejected</div>
                          <div style={{background:"rgba(198,40,40,0.07)",border:`1.5px solid rgba(198,40,40,0.2)`,borderRadius:14,padding:"14px 16px",marginBottom:16}}>
                            <div style={{fontSize:13,color:C.text,fontWeight:700,marginBottom:4}}>Your order was rejected by the outlet.</div>
                            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>This may be due to payment not received or item unavailability. Please place a new order or visit the counter.</div>
                          </div>
                          <button onClick={()=>{setCart({});setCustScreen("menu");setActiveOrderId(null);setPayMethod("");setUpiPaid(false);setShowRating(false);setStars(0);setSecs(25*60);}} style={{background:`linear-gradient(135deg,${C.pri},${C.amb})`,border:"none",borderRadius:12,padding:"12px 28px",color:"white",fontWeight:900,fontSize:14,cursor:"pointer",boxShadow:`0 6px 18px rgba(200,54,10,0.35)`}}>
                            🍔 Order Again
                          </button>
                        </div>
                      ):trackStatus==="pending"?(
                        <div>
                          <div style={{fontSize:36,marginBottom:8}}>⏳</div>
                          <div style={{fontFamily:"Georgia,serif",fontSize:15,fontWeight:900,color:C.text,marginBottom:3}}>Waiting for Outlet</div>
                          <div style={{color:C.muted,fontSize:12}}>Your order is being reviewed...</div>
                        </div>
                      ):(
                        <svg width="156" height="156" viewBox="0 0 156 156" style={{display:"block",margin:"0 auto"}}>
                          <circle cx="78" cy="78" r="62" fill="none" stroke="#F5E6D3" strokeWidth="11"/>
                          <circle cx="78" cy="78" r="62" fill="none" stroke={C.pri} strokeWidth="11"
                            strokeDasharray={2*Math.PI*62} strokeDashoffset={2*Math.PI*62*(1-(secs/(25*60)))}
                            strokeLinecap="round" transform="rotate(-90 78 78)" style={{transition:"stroke-dashoffset 1s linear"}}/>
                          <text x="78" y="74" textAnchor="middle" fontFamily="Georgia,serif" fontSize="22" fontWeight="900" fill={C.text}>{fmt(secs)}</text>
                          <text x="78" y="93" textAnchor="middle" fontSize="10" fill={C.muted}>remaining</text>
                        </svg>
                      )}
                    </div>
                    <div style={{background:"white",borderRadius:16,padding:"14px 13px",marginBottom:12,boxShadow:"0 4px 14px rgba(0,0,0,0.07)"}}>
                      {TRACK_STEPS.map((s,i)=>(
                        <div key={s.key} style={{display:"flex",alignItems:"flex-start",gap:11,paddingBottom:i<3?15:0,position:"relative"}}>
                          {i<3&&<div style={{position:"absolute",left:17,top:38,width:2,height:15,background:i<stepIdx?C.pri:"#EDE0D4"}}/>}
                          <div style={{width:36,height:36,borderRadius:"50%",background:i<=stepIdx?`linear-gradient(135deg,${C.pri},${C.amb})`:"#F5EEE8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0,boxShadow:i<=stepIdx?"0 3px 8px rgba(200,54,10,0.25)":"none",transition:"all 0.5s"}}>
                            {i<=stepIdx?s.icon:"○"}
                          </div>
                          <div style={{paddingTop:6,flex:1}}>
                            <div style={{fontWeight:800,fontSize:12,color:i<=stepIdx?C.text:"#C0B0A0"}}>{s.label}</div>
                            <div style={{fontSize:11,color:i<=stepIdx?C.muted:"#D5C8BE"}}>{s.sub}</div>
                          </div>
                          {i===stepIdx&&trackStatus!=="ready"&&<div style={{marginLeft:"auto",paddingTop:13}}><div style={{width:8,height:8,borderRadius:"50%",background:C.amb,animation:"blink 1s infinite"}}/></div>}
                        </div>
                      ))}
                    </div>
                    <div style={{background:"white",borderRadius:14,padding:13,marginBottom:12,boxShadow:"0 4px 14px rgba(0,0,0,0.07)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
                        <span style={{fontFamily:"Georgia,serif",fontSize:13,fontWeight:900,color:C.text}}>Order #{activeOrder.id}</span>
                        <button onClick={()=>setInvoiceOrder(activeOrder)} style={{background:`linear-gradient(135deg,${C.pri},${C.amb})`,border:"none",borderRadius:8,color:"white",padding:"5px 11px",fontSize:11,fontWeight:800,cursor:"pointer"}}>📄 Invoice</button>
                      </div>
                      {activeOrder.items.map(i=>(
                        <div key={i.id} style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12}}>
                          <span style={{color:C.text}}>{i.name} ×{i.qty}</span><span style={{fontWeight:700,color:C.muted}}>₹{i.price*i.qty}</span>
                        </div>
                      ))}
                      <div style={{borderTop:`2px dashed rgba(200,54,10,0.2)`,marginTop:8,paddingTop:8,display:"flex",justifyContent:"space-between"}}>
                        <span style={{fontWeight:900,fontSize:13}}>Total Paid</span><span style={{fontWeight:900,color:C.pri}}>₹{activeOrder.total}</span>
                      </div>
                    </div>
                    {trackStatus==="ready"&&!showRating&&(
                      <button onClick={()=>setShowRating(true)} style={{width:"100%",background:`linear-gradient(135deg,${C.pri},${C.amb})`,border:"none",borderRadius:14,padding:13,color:"white",fontSize:14,fontWeight:900,cursor:"pointer",marginBottom:10,boxShadow:"0 8px 20px rgba(200,54,10,0.4)"}}>
                        🍔 Place Another Order
                      </button>
                    )}
                    {showRating&&(
                      <div style={{background:"white",borderRadius:16,padding:16,marginBottom:12,textAlign:"center",boxShadow:"0 4px 14px rgba(0,0,0,0.07)"}}>
                        <div style={{fontFamily:"Georgia,serif",fontSize:15,fontWeight:900,color:C.text,marginBottom:3}}>Rate your experience</div>
                        <div style={{color:C.muted,fontSize:12,marginBottom:12}}>How was your order?</div>
                        <div style={{display:"flex",justifyContent:"center",gap:5,marginBottom:14}}>
                          {[1,2,3,4,5].map(n=>(
                            <button key={n} onMouseEnter={()=>setHoverStar(n)} onMouseLeave={()=>setHoverStar(0)} onClick={()=>setStars(n)}
                              style={{background:"none",border:"none",fontSize:32,cursor:"pointer",color:n<=(hoverStar||stars)?C.amb:"#E8DDD4",transform:n<=(hoverStar||stars)?"scale(1.15)":"scale(1)",transition:"all 0.15s"}}>★</button>
                          ))}
                        </div>
                        <div style={{marginBottom:12}}>
                          <textarea
                            key="feedback-box"
                            placeholder="Write your feedback (optional)..."
                            value={feedback}
                            onChange={e=>setFeedback(e.target.value)}
                            rows={3}
                            style={{width:"100%",padding:"10px 13px",borderRadius:12,border:`1.5px solid ${C.bdr}`,fontSize:12,fontFamily:"inherit",color:C.text,resize:"none",outline:"none",boxSizing:"border-box",background:"#fafaf8",lineHeight:1.5}}
                          />
                        </div>
                        <div style={{display:"flex",gap:9,justifyContent:"center"}}>
                          {stars>0&&<button onClick={()=>{
                            // Save rating+feedback to this order in history and shared storage
                            if (activeOrderId) {
                              const updHist = myHistory.map(o=>o.id===activeOrderId?{...o,rating:stars,feedback:feedback.trim()}:o);
                              setMyHistory(updHist);
                              writeUserDoc(userPhone, "history", { orders: updHist }).catch(()=>{});
                              // Also update shared orders so outlet can see
                              const updOrders = orders.map(o=>o.id===activeOrderId?{...o,rating:stars,feedback:feedback.trim()}:o);
                              setOrders(updOrders);
                              syncOrdersToStorage(updOrders);
                            }
                            setCart({});setCustScreen("menu");setActiveOrderId(null);setPayMethod("");setUpiPaid(false);setShowRating(false);setStars(0);setFeedback("");setSecs(25*60);
                          }} style={{background:`linear-gradient(135deg,${C.pri},${C.amb})`,border:"none",borderRadius:12,color:"white",padding:"10px 18px",fontSize:13,fontWeight:800,cursor:"pointer"}}>Submit & Order Again</button>}
                          <button onClick={()=>{setCart({});setCustScreen("menu");setActiveOrderId(null);setPayMethod("");setUpiPaid(false);setShowRating(false);setStars(0);setFeedback("");setSecs(25*60);}} style={{background:"none",border:`1.5px solid ${C.bdr}`,borderRadius:12,color:C.muted,padding:"10px 14px",fontSize:13,cursor:"pointer"}}>Not Now</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ORDER HISTORY */}
              {custScreen==="history"&&(
                <div style={{display:"flex",flexDirection:"column",minHeight:"100vh"}}>
                  <NavBar title="Order History" onBack={()=>setCustScreen("menu")}/>
                  <div style={{flex:1,overflowY:"auto",padding:10}}>
                    {myHistory.length===0?(
                      <div style={{textAlign:"center",padding:"60px 20px",color:C.muted}}>
                        <div style={{fontSize:40,marginBottom:10}}>📋</div>
                        <div style={{fontFamily:"Georgia,serif",fontSize:15,fontWeight:700,color:C.text,marginBottom:5}}>No Orders Yet</div>
                        <div style={{fontSize:13}}>Your past orders will appear here</div>
                      </div>
                    ):myHistory.map(order=>(
                      <div key={order.id} style={{background:"white",borderRadius:14,padding:"13px 14px",marginBottom:9,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",borderLeft:`3px solid ${order.status==="ready"?C.grn:order.status==="rejected"?C.red:C.pri}`}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                          <div>
                            <div style={{fontFamily:"Georgia,serif",fontSize:13,fontWeight:900,color:C.text}}>Order #{order.id}</div>
                            <div style={{fontSize:10,color:C.muted,marginTop:1}}>{order.timestamp}</div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <span style={{background:order.status==="ready"?"rgba(46,125,50,0.12)":order.status==="rejected"?"rgba(198,40,40,0.1)":order.status==="accepted"?"rgba(46,125,50,0.08)":order.status==="almost"?"rgba(245,146,28,0.12)":"rgba(200,54,10,0.08)",color:order.status==="ready"?C.grn:order.status==="rejected"?C.red:order.status==="accepted"?C.grn:order.status==="almost"?"#E65100":C.pri,fontSize:10,fontWeight:800,padding:"3px 9px",borderRadius:10,display:"inline-block"}}>{order.status.toUpperCase()}</span>
                            <div style={{fontSize:15,fontWeight:900,color:C.pri,marginTop:4}}>₹{order.total}</div>
                          </div>
                        </div>
                        <div style={{fontSize:11,color:C.muted,marginBottom:5,lineHeight:1.5}}>{order.items.map(i=>`${i.name} ×${i.qty}`).join(" · ")}</div>
                        <div style={{fontSize:10,color:C.muted,marginBottom:9}}>{order.payMethod==="upi"?"📱 UPI / PhonePe":"💵 Cash at Counter"}</div>
                        <button onClick={()=>setInvoiceOrder(order)} style={{width:"100%",background:"none",border:`1.5px dashed ${C.pri}`,borderRadius:10,color:C.pri,fontSize:12,fontWeight:800,padding:"8px",cursor:"pointer"}}>📄 View Invoice</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════ OUTLET APP ═══════════════════════ */}
          {loggedIn && loginType==="outlet" && (
            <div style={{minHeight:"100vh"}}>
              <div style={{background:"linear-gradient(155deg,#1B0800,#3D1507)",padding:"14px 14px",position:"sticky",top:0,zIndex:10}}>
                <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:12}}>
                  <img src={LOGO_IMG} alt="QB" style={{height:30,width:30,objectFit:"contain",borderRadius:8}}/>
                  <div>
                    <div style={{fontFamily:"Georgia,serif",fontSize:17,fontWeight:900,color:"white"}}>QuickBites Outlet</div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.45)",display:"flex",alignItems:"center",gap:4}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"#66BB6A",display:"inline-block",animation:"blink 2s infinite"}}/>
              Live · auto-syncs every 4s
            </div>
                  </div>
                  <button onClick={confirmLogout} style={{marginLeft:"auto",background:"rgba(255,255,255,0.08)",border:"none",borderRadius:8,padding:"5px 10px",color:"rgba(255,255,255,0.55)",fontSize:11,cursor:"pointer",flexShrink:0}}>Logout</button>
                </div>
                <div style={{display:"flex",gap:2,background:"rgba(255,255,255,0.07)",borderRadius:12,padding:3}}>
                  {[
                    {k:"orders",label:`📋 Orders${orders.filter(o=>["pending","accepted","almost"].includes(o.status)).length>0?` (${orders.filter(o=>["pending","accepted","almost"].includes(o.status)).length})`:""}`},
                    {k:"inventory",label:"📦 Inventory"},
                    {k:"add",label:"➕ Add Item"},
                    {k:"promos",label:"🎟️ Promos"},
                    ...(editItem?[{k:"edit",label:`✏️ Edit`}]:[]),
                  ].map(tab=>(
                    <button key={tab.k} onClick={()=>setOutletTab(tab.k)} style={{flex:1,background:outletTab===tab.k?"white":"none",border:"none",borderRadius:10,padding:"7px 4px",color:outletTab===tab.k?C.text:"rgba(255,255,255,0.6)",fontWeight:700,fontSize:11,cursor:"pointer",transition:"all 0.2s"}}>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{padding:10}}>
                {/* ORDERS */}
                {outletTab==="orders"&&(()=>{
                  const pending=orders.filter(o=>["pending","accepted","almost"].includes(o.status));
                  const done=orders.filter(o=>["ready","rejected"].includes(o.status));
                  const Sbadge=({s})=>{
                    const m={pending:{bg:"rgba(200,54,10,0.1)",c:C.pri,l:"PENDING"},accepted:{bg:"rgba(46,125,50,0.1)",c:C.grn,l:"ACCEPTED"},almost:{bg:"rgba(245,146,28,0.15)",c:"#E65100",l:"ALMOST READY"},ready:{bg:"rgba(46,125,50,0.15)",c:C.grn,l:"READY"},rejected:{bg:"rgba(198,40,40,0.1)",c:C.red,l:"REJECTED"}};
                    const d=m[s]||m.pending;
                    return <span style={{background:d.bg,color:d.c,fontSize:10,fontWeight:800,padding:"3px 9px",borderRadius:10}}>{d.l}</span>;
                  };
                  return (
                    <>
                      {pending.length===0&&done.length===0&&(
                        <div style={{textAlign:"center",padding:"60px 20px",color:C.muted}}>
                          <div style={{fontSize:40,marginBottom:10}}>📭</div>
                          <div style={{fontFamily:"Georgia,serif",fontSize:15,fontWeight:700,color:C.text}}>No orders yet</div>
                        </div>
                      )}
                      {pending.length>0&&(
                        <>
                          <div style={{fontSize:11,fontWeight:800,color:C.muted,letterSpacing:0.5,marginBottom:8}}>ACTIVE ({pending.length})</div>
                          {pending.map(order=>(
                            <div key={order.id} style={{background:"white",borderRadius:14,padding:"12px 13px",marginBottom:9,boxShadow:"0 3px 12px rgba(0,0,0,0.08)",border:`1px solid rgba(200,54,10,0.1)`}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
                                <div><div style={{fontFamily:"Georgia,serif",fontSize:13,fontWeight:900,color:C.text}}>#{order.id}</div><div style={{fontSize:11,color:C.muted}}>{order.name} · +91 {order.phone}</div></div>
                                <div style={{textAlign:"right"}}><Sbadge s={order.status}/><div style={{fontSize:14,fontWeight:900,color:C.pri,marginTop:3}}>₹{order.total}</div></div>
                              </div>
                              <div style={{fontSize:11,color:C.muted,marginBottom:6}}>{order.items.map(i=>`${i.name}×${i.qty}`).join(" · ")}</div>
                              <div style={{fontSize:10,color:C.muted,marginBottom:9}}>{order.payMethod==="upi"?"📱 UPI":"💵 Cash"} · {order.timestamp}</div>
                              <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                                {order.status==="pending"&&<><button onClick={()=>outletAction(order.id,"accepted")} style={{flex:1,background:`linear-gradient(135deg,${C.grn},#388E3C)`,border:"none",borderRadius:10,padding:"9px",color:"white",fontWeight:800,fontSize:12,cursor:"pointer"}}>✓ Accept</button><button onClick={()=>outletAction(order.id,"rejected")} style={{flex:1,background:"white",border:`1.5px solid ${C.red}`,borderRadius:10,padding:"9px",color:C.red,fontWeight:800,fontSize:12,cursor:"pointer"}}>✗ Reject</button></>}
                                {order.status==="accepted"&&<button onClick={()=>outletAction(order.id,"almost")} style={{flex:1,background:`linear-gradient(135deg,#E65100,${C.amb})`,border:"none",borderRadius:10,padding:"9px",color:"white",fontWeight:800,fontSize:12,cursor:"pointer"}}>⚡ Almost Ready</button>}
                                {order.status==="almost"&&<button onClick={()=>outletAction(order.id,"ready")} style={{flex:1,background:`linear-gradient(135deg,${C.pri},${C.amb})`,border:"none",borderRadius:10,padding:"9px",color:"white",fontWeight:800,fontSize:12,cursor:"pointer"}}>🎉 Mark Ready!</button>}
                                <button onClick={()=>setInvoiceOrder(order)} style={{background:"none",border:`1.5px solid ${C.bdr}`,borderRadius:10,padding:"9px 12px",color:C.text,fontWeight:700,fontSize:12,cursor:"pointer"}}>📄</button>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                      {done.length>0&&(
                        <>
                          <div style={{fontSize:11,fontWeight:800,color:C.muted,letterSpacing:0.5,marginBottom:8,marginTop:8}}>COMPLETED ({done.length})</div>
                          {done.slice().reverse().map(order=>(
                            <div key={order.id}
                              style={{background:"white",borderRadius:12,marginBottom:7,boxShadow:"0 2px 8px rgba(0,0,0,0.05)",overflow:"hidden",cursor:"pointer"}}
                              onClick={()=>setSelectedDoneOrder(selectedDoneOrder===order.id?null:order.id)}>
                              {/* Header row — always visible */}
                              <div style={{padding:"11px 13px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                <div>
                                  <span style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:12,color:C.text}}>#{order.id}</span>
                                  <span style={{fontSize:11,color:C.muted,marginLeft:7}}>{order.name}</span>
                                  <div style={{fontSize:10,color:C.muted,marginTop:2}}>{order.items.map(i=>`${i.name}×${i.qty}`).join(" · ")}</div>
                                </div>
                                <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                                  <Sbadge s={order.status}/>
                                  <span style={{fontSize:13,fontWeight:900,color:C.pri}}>₹{order.total}</span>
                                  <span style={{fontSize:12,color:C.muted,transition:"transform 0.2s",display:"inline-block",transform:selectedDoneOrder===order.id?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
                                </div>
                              </div>
                              {/* Expanded section — only when selected */}
                              {selectedDoneOrder===order.id&&(
                                <div style={{borderTop:`1px dashed ${C.bdr}`,padding:"12px 13px",background:"#fdfaf7"}} onClick={e=>e.stopPropagation()}>
                                  {/* Rating & Feedback — only if rated */}
                                  {order.rating?(
                                    <div style={{marginBottom:10}}>
                                      <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:0.5,marginBottom:6}}>RATING & FEEDBACK</div>
                                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:order.feedback?8:0}}>
                                        <div style={{display:"flex",gap:2}}>
                                          {[1,2,3,4,5].map(n=>(
                                            <span key={n} style={{fontSize:18,color:n<=order.rating?C.amb:"#E8DDD4"}}>★</span>
                                          ))}
                                        </div>
                                        <span style={{fontSize:12,fontWeight:800,color:C.text}}>{order.rating}/5</span>
                                      </div>
                                      {order.feedback&&(
                                        <div style={{background:"white",border:`1px solid ${C.bdr}`,borderRadius:10,padding:"9px 12px"}}>
                                          <span style={{fontSize:12,color:C.text,fontStyle:"italic",lineHeight:1.5}}>"{order.feedback}"</span>
                                        </div>
                                      )}
                                    </div>
                                  ):(
                                    <div style={{fontSize:11,color:C.muted,marginBottom:10,fontStyle:"italic"}}>No rating submitted yet</div>
                                  )}
                                  {/* Actions */}
                                  <div style={{display:"flex",gap:8}}>
                                    <button onClick={()=>setInvoiceOrder(order)} style={{flex:1,background:"none",border:`1.5px solid ${C.bdr}`,borderRadius:10,padding:"8px",color:C.text,fontWeight:700,fontSize:12,cursor:"pointer"}}>📄 Invoice</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  );
                })()}

                {/* INVENTORY */}
                {outletTab==="inventory"&&(
                  <>
                    <div style={{fontSize:11,fontWeight:800,color:C.muted,letterSpacing:0.5,marginBottom:10}}>INVENTORY MANAGEMENT</div>
                    {menuItems.map(item=>(
                      <div key={item.id} style={{background:"white",borderRadius:14,padding:"12px 13px",marginBottom:8,display:"flex",alignItems:"center",gap:10,boxShadow:"0 2px 8px rgba(0,0,0,0.05)",opacity:inventory[item.id]?1:0.6}}>
                        {item.img&&<img src={item.img} alt={item.name} style={{width:44,height:44,borderRadius:10,objectFit:"cover",flexShrink:0}}/>}
                        <div style={{flex:1}}>
                          <div style={{fontFamily:"Georgia,serif",fontSize:13,fontWeight:800,color:C.text}}>{item.name}{item.tag&&` (${item.tag})`}</div>
                          <div style={{fontSize:11,color:C.muted,marginTop:1}}>₹{item.price} · {item.cat}</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
                          <span style={{fontSize:10,fontWeight:700,color:inventory[item.id]?C.grn:C.red}}>{inventory[item.id]?"IN STOCK":"OUT"}</span>
                          <button onClick={()=>openEditItem(item)} style={{background:`linear-gradient(135deg,${C.pri},${C.amb})`,border:"none",borderRadius:10,padding:"7px 10px",color:"white",fontWeight:800,fontSize:11,cursor:"pointer"}}>✏️</button>
                          <button onClick={()=>toggleStock(item.id)} style={{background:inventory[item.id]?`linear-gradient(135deg,${C.red},#C62828)`:`linear-gradient(135deg,${C.grn},#388E3C)`,border:"none",borderRadius:10,padding:"7px 11px",color:"white",fontWeight:800,fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>
                            {inventory[item.id]?"Unstock":"Restock"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* ADD ITEM */}
                {outletTab==="edit"&&editItem&&(
                  <>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                      <button onClick={()=>{setEditItem(null);setOutletTab("inventory");}} style={{background:"white",border:`1.5px solid ${C.bdr}`,borderRadius:10,padding:"7px 12px",fontSize:12,fontWeight:700,color:C.text,cursor:"pointer"}}>← Back</button>
                      <div style={{fontSize:11,fontWeight:800,color:C.muted,letterSpacing:0.5}}>EDITING: {editItem.name.toUpperCase()}</div>
                    </div>
                    <div style={{background:"white",borderRadius:16,padding:16,boxShadow:"0 3px 14px rgba(0,0,0,0.07)"}}>
                      <div style={{display:"grid",gap:10}}>
                        <input key="edit-name" placeholder="Item Name *" value={editName} onChange={e=>setEditName(e.target.value)} style={{width:"100%",padding:"11px 13px",borderRadius:12,border:`1.5px solid ${C.bdr}`,fontSize:14,outline:"none",fontFamily:"inherit",color:C.text,background:"white",boxSizing:"border-box"}}/>
                        <input key="edit-desc" placeholder="Description *" value={editDesc} onChange={e=>setEditDesc(e.target.value)} style={{width:"100%",padding:"11px 13px",borderRadius:12,border:`1.5px solid ${C.bdr}`,fontSize:14,outline:"none",fontFamily:"inherit",color:C.text,background:"white",boxSizing:"border-box"}}/>
                        <div style={{display:"flex",gap:10}}>
                          <div style={{flex:1}}>
                            <label style={{fontSize:11,color:C.muted,fontWeight:700,display:"block",marginBottom:5}}>Price (₹) *</label>
                            <input key="edit-price" placeholder="e.g. 60" value={editPrice} onChange={e=>setEditPrice(e.target.value.replace(/\D/g,""))} style={{width:"100%",padding:"11px 13px",borderRadius:12,border:`1.5px solid ${C.bdr}`,fontSize:14,outline:"none",fontFamily:"inherit",color:C.text,background:"white",boxSizing:"border-box"}}/>
                          </div>
                          <div style={{flex:1}}>
                            <label style={{fontSize:11,color:C.muted,fontWeight:700,display:"block",marginBottom:5}}>Category</label>
                            <select value={editCat} onChange={e=>setEditCat(e.target.value)} style={{width:"100%",padding:"11px 13px",borderRadius:12,border:`1.5px solid ${C.bdr}`,fontSize:13,outline:"none",fontFamily:"inherit",color:C.text,background:"white",boxSizing:"border-box",cursor:"pointer"}}>
                              {[...new Set(menuItems.map(i=>i.cat))].map(c=><option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        </div>
                        <input key="edit-tag" placeholder="Tag (optional, e.g. '6 pcs')" value={editTag} onChange={e=>setEditTag(e.target.value)} style={{width:"100%",padding:"11px 13px",borderRadius:12,border:`1.5px solid ${C.bdr}`,fontSize:14,outline:"none",fontFamily:"inherit",color:C.text,background:"white",boxSizing:"border-box"}}/>
                        <div>
                          <label style={{fontSize:11,color:C.muted,fontWeight:700,display:"block",marginBottom:5}}>Badge</label>
                          <div style={{display:"flex",gap:8}}>
                            {["","Bestseller","Popular"].map(b=>(
                              <button key={b||"none"} onClick={()=>setEditBadge(b)} style={{flex:1,background:editBadge===b?`linear-gradient(135deg,${C.pri},${C.amb})`:"white",border:`1.5px solid ${editBadge===b?C.pri:C.bdr}`,borderRadius:10,padding:"8px",color:editBadge===b?"white":C.text,fontWeight:700,fontSize:12,cursor:"pointer"}}>
                                {b||"None"}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Photo section */}
                        <div>
                          <label style={{fontSize:11,color:C.muted,fontWeight:700,display:"block",marginBottom:5}}>Food Photo</label>
                          {editImg?(
                            <div style={{position:"relative",borderRadius:12,overflow:"hidden",height:130,background:"#f0e8e0"}}>
                              <img src={editImg} alt="preview" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                              <div style={{position:"absolute",bottom:0,left:0,right:0,display:"flex",gap:6,padding:8}}>
                                <label htmlFor="edit-img-upload" style={{flex:1,background:"rgba(0,0,0,0.6)",border:"none",borderRadius:8,color:"white",padding:"7px",fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"center"}}>
                                  📷 Change Photo
                                  <input id="edit-img-upload" type="file" accept="image/*" style={{display:"none"}}
                                    onChange={e=>{
                                      const file=e.target.files[0];
                                      if(!file) return;
                                      if(file.size>2*1024*1024){showToast("Max 2MB");return;}
                                      const r=new FileReader();
                                      r.onload=ev=>setEditImg(ev.target.result);
                                      r.readAsDataURL(file);
                                    }}/>
                                </label>
                                <button onClick={()=>setEditImg("")} style={{background:"rgba(198,40,40,0.75)",border:"none",borderRadius:8,color:"white",padding:"7px 12px",fontSize:11,fontWeight:700,cursor:"pointer"}}>✕</button>
                              </div>
                            </div>
                          ):(
                            <label htmlFor="edit-img-upload2" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,border:`2px dashed ${C.bdr}`,borderRadius:12,padding:"18px",cursor:"pointer",background:"#fafaf8"}}>
                              <span style={{fontSize:32}}>📷</span>
                              <span style={{fontSize:12,fontWeight:700,color:C.muted}}>Tap to add food photo</span>
                              <span style={{fontSize:10,color:C.muted}}>JPG, PNG up to 2MB</span>
                              <input id="edit-img-upload2" type="file" accept="image/*" style={{display:"none"}}
                                onChange={e=>{
                                  const file=e.target.files[0];
                                  if(!file) return;
                                  if(file.size>2*1024*1024){showToast("Max 2MB");return;}
                                  const r=new FileReader();
                                  r.onload=ev=>setEditImg(ev.target.result);
                                  r.readAsDataURL(file);
                                }}/>
                            </label>
                          )}
                        </div>
                        <button onClick={saveEditItem} style={{background:`linear-gradient(135deg,${C.pri},${C.amb})`,border:"none",borderRadius:12,padding:"13px",color:"white",fontWeight:900,fontSize:14,cursor:"pointer",boxShadow:`0 6px 18px rgba(200,54,10,0.35)`,marginTop:4}}>
                          💾 Save Changes
                        </button>
                      </div>
                    </div>
                  </>
                )}

                                {outletTab==="promos"&&(
                  <>
                    <div style={{fontSize:11,fontWeight:800,color:C.muted,letterSpacing:0.5,marginBottom:12}}>PROMO CODE MANAGER</div>
                    {/* Create promo form */}
                    <div style={{background:"white",borderRadius:16,padding:16,marginBottom:14,boxShadow:"0 3px 14px rgba(0,0,0,0.07)"}}>
                      <div style={{fontFamily:"Georgia,serif",fontSize:14,fontWeight:900,color:C.text,marginBottom:12}}>Create New Promo Code</div>
                      <div style={{display:"grid",gap:10}}>
                        <input key="promo-code-inp" placeholder="Code (e.g. SAVE20)" value={promoCode} onChange={e=>setPromoCode(e.target.value.toUpperCase().replace(/\s/g,""))} style={{width:"100%",padding:"11px 13px",borderRadius:12,border:`1.5px solid ${C.bdr}`,fontSize:14,outline:"none",fontFamily:"monospace",letterSpacing:2,color:C.text,background:"white",boxSizing:"border-box"}}/>
                        <div style={{display:"flex",gap:10}}>
                          <div style={{flex:1}}>
                            <label style={{fontSize:11,color:C.muted,fontWeight:700,display:"block",marginBottom:5}}>Discount %</label>
                            <input key="promo-disc" placeholder="e.g. 20" value={promoDiscount} onChange={e=>setPromoDiscount(e.target.value.replace(/\D/g,"").slice(0,2))} style={{width:"100%",padding:"11px 13px",borderRadius:12,border:`1.5px solid ${C.bdr}`,fontSize:14,outline:"none",fontFamily:"inherit",color:C.text,background:"white",boxSizing:"border-box"}}/>
                          </div>
                          <div style={{flex:1}}>
                            <label style={{fontSize:11,color:C.muted,fontWeight:700,display:"block",marginBottom:5}}>Max Uses (blank=unlimited)</label>
                            <input key="promo-usage" placeholder="e.g. 50" value={promoUsage} onChange={e=>setPromoUsage(e.target.value.replace(/\D/g,""))} style={{width:"100%",padding:"11px 13px",borderRadius:12,border:`1.5px solid ${C.bdr}`,fontSize:14,outline:"none",fontFamily:"inherit",color:C.text,background:"white",boxSizing:"border-box"}}/>
                          </div>
                        </div>
                        <div>
                          <label style={{fontSize:11,color:C.muted,fontWeight:700,display:"block",marginBottom:5}}>Expiry Date (blank=no expiry)</label>
                          <input key="promo-expiry" type="date" value={promoExpiry} onChange={e=>setPromoExpiry(e.target.value)} style={{width:"100%",padding:"11px 13px",borderRadius:12,border:`1.5px solid ${C.bdr}`,fontSize:13,outline:"none",fontFamily:"inherit",color:C.text,background:"white",boxSizing:"border-box"}}/>
                        </div>
                        <button onClick={()=>{
                          if(!promoCode.trim()){showToast("Enter a promo code");return;}
                          if(!promoDiscount||+promoDiscount<=0||+promoDiscount>99){showToast("Enter discount 1–99%");return;}
                          if(promoCodes.find(p=>p.code===promoCode)){showToast("Code already exists!");return;}
                          const newPromo = {code:promoCode,discount:+promoDiscount,usageLimit:promoUsage||"",expiry:promoExpiry||"",usedCount:0,active:true,createdAt:new Date().toLocaleDateString("en-IN")};
                          const updated = [newPromo,...promoCodes];
                          setPromoCodes(updated);
                          writeShared("promos", { list: updated }).catch(()=>{});
                          setPromoCode(""); setPromoDiscount(""); setPromoUsage(""); setPromoExpiry("");
                          showToast(`✅ Promo "${newPromo.code}" created!`,3000);
                        }} style={{background:`linear-gradient(135deg,${C.pri},${C.amb})`,border:"none",borderRadius:12,padding:"13px",color:"white",fontWeight:900,fontSize:14,cursor:"pointer",boxShadow:`0 6px 18px rgba(200,54,10,0.3)`}}>
                          🎟️ Create Promo Code
                        </button>
                      </div>
                    </div>
                    {/* Existing promos list */}
                    {promoCodes.length>0&&(
                      <>
                        <div style={{fontSize:11,fontWeight:800,color:C.muted,letterSpacing:0.5,marginBottom:9}}>YOUR PROMO CODES ({promoCodes.length})</div>
                        {promoCodes.map(p=>(
                          <div key={p.code} style={{background:"white",borderRadius:14,padding:"12px 14px",marginBottom:9,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",opacity:p.active?1:0.55,borderLeft:`3px solid ${p.active?C.grn:C.red}`}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                              <div>
                                <div style={{fontFamily:"monospace",fontSize:15,fontWeight:900,color:C.text,letterSpacing:1}}>{p.code}</div>
                                <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                                  {p.discount}% off · Used {p.usedCount||0}{p.usageLimit?`/${p.usageLimit}`:""} times
                                  {p.expiry&&` · Expires ${p.expiry}`}
                                  {!p.expiry&&" · No expiry"}
                                </div>
                                <div style={{fontSize:10,color:C.muted,marginTop:1}}>Created {p.createdAt}</div>
                              </div>
                              <div style={{display:"flex",gap:6,flexShrink:0}}>
                                <button onClick={()=>{
                                  const updated=promoCodes.map(x=>x.code===p.code?{...x,active:!x.active}:x);
                                  setPromoCodes(updated);
                                  writeShared("promos", { list: updated }).catch(()=>{});
                                  showToast(`${p.active?"Deactivated":"Activated"} ${p.code}`);
                                }} style={{background:p.active?`linear-gradient(135deg,${C.red},#C62828)`:`linear-gradient(135deg,${C.grn},#388E3C)`,border:"none",borderRadius:9,padding:"6px 10px",color:"white",fontWeight:800,fontSize:11,cursor:"pointer"}}>
                                  {p.active?"Disable":"Enable"}
                                </button>
                                <button onClick={()=>{
                                  const updated=promoCodes.filter(x=>x.code!==p.code);
                                  setPromoCodes(updated);
                                  writeShared("promos", { list: updated }).catch(()=>{});
                                  showToast(`"${p.code}" deleted`);
                                }} style={{background:"none",border:`1.5px solid ${C.red}`,borderRadius:9,padding:"6px 10px",color:C.red,fontWeight:800,fontSize:11,cursor:"pointer"}}>Del</button>
                              </div>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <div style={{width:8,height:8,borderRadius:"50%",background:p.active?C.grn:C.red,flexShrink:0}}/>
                              <span style={{fontSize:11,fontWeight:700,color:p.active?C.grn:C.red}}>{p.active?"ACTIVE":"DISABLED"}</span>
                              {p.usageLimit&&+p.usageLimit>0&&<div style={{flex:1,height:4,background:"#f0e8e0",borderRadius:4,marginLeft:4,overflow:"hidden"}}><div style={{height:"100%",background:`linear-gradient(90deg,${C.pri},${C.amb})`,width:`${Math.min(100,((p.usedCount||0)/+p.usageLimit)*100)}%`,borderRadius:4,transition:"width 0.5s"}}/></div>}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )}

                                {outletTab==="add"&&(
                  <>
                    <div style={{fontSize:11,fontWeight:800,color:C.muted,letterSpacing:0.5,marginBottom:12}}>ADD NEW MENU ITEM</div>
                    <div style={{background:"white",borderRadius:16,padding:16,boxShadow:"0 3px 14px rgba(0,0,0,0.07)"}}>
                      <div style={{display:"grid",gap:10}}>
                        <input
                          key="new-name"
                          placeholder="Item Name *"
                          value={newName}
                          onChange={e=>setNewName(e.target.value)}
                          style={inp()}
                        />
                        <input
                          key="new-desc"
                          placeholder="Description *"
                          value={newDesc}
                          onChange={e=>setNewDesc(e.target.value)}
                          style={inp()}
                        />
                        <div style={{display:"flex",gap:10}}>
                          <div style={{flex:1}}>
                            <label style={{fontSize:11,color:C.muted,fontWeight:700,display:"block",marginBottom:5}}>Price (₹) *</label>
                            <input
                              key="new-price"
                              placeholder="e.g. 60"
                              value={newPrice}
                              onChange={e=>setNewPrice(e.target.value.replace(/\D/g,""))}
                              style={inp()}
                            />
                          </div>
                          <div style={{flex:1}}>
                            <label style={{fontSize:11,color:C.muted,fontWeight:700,display:"block",marginBottom:5}}>Category</label>
                            <select value={newCat} onChange={e=>setNewCat(e.target.value)} style={{...inp(),cursor:"pointer",background:"white"}}>
                              {[...new Set(menuItems.map(i=>i.cat))].map(c=><option key={c} value={c}>{c}</option>)}
                              <option value="__new__">+ New Category</option>
                            </select>
                          </div>
                        </div>
                        {newCat==="__new__"&&(
                          <input
                            key="new-cat-custom"
                            placeholder="Type new category name..."
                            value={newCustomCat}
                            onChange={e=>{setNewCustomCat(e.target.value);}}
                            style={inp()}
                          />
                        )}
                        <input
                          key="new-tag"
                          placeholder="Tag (optional, e.g. '6 pcs')"
                          value={newTag}
                          onChange={e=>setNewTag(e.target.value)}
                          style={inp()}
                        />
                        <div>
                          <label style={{fontSize:11,color:C.muted,fontWeight:700,display:"block",marginBottom:5}}>Badge (optional)</label>
                          <div style={{display:"flex",gap:8}}>
                            {["","Bestseller","Popular"].map(b=>(
                              <button key={b||"none"} onClick={()=>setNewBadge(b)} style={{flex:1,background:newBadge===b?`linear-gradient(135deg,${C.pri},${C.amb})`:"white",border:`1.5px solid ${newBadge===b?C.pri:C.bdr}`,borderRadius:10,padding:"8px",color:newBadge===b?"white":C.text,fontWeight:700,fontSize:12,cursor:"pointer"}}>
                                {b||"None"}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Photo upload */}
                        <div>
                          <label style={{fontSize:11,color:C.muted,fontWeight:700,display:"block",marginBottom:5}}>Food Photo (optional)</label>
                          {newImg?(
                            <div style={{position:"relative",borderRadius:12,overflow:"hidden",height:110,background:"#f0e8e0"}}>
                              <img src={newImg} alt="preview" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                              <button onClick={()=>setNewImg("")} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,0.55)",border:"none",borderRadius:8,color:"white",padding:"4px 9px",fontSize:11,fontWeight:700,cursor:"pointer"}}>✕ Remove</button>
                            </div>
                          ):(
                            <label htmlFor="food-img-upload" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,border:`2px dashed ${C.bdr}`,borderRadius:12,padding:"18px",cursor:"pointer",background:"#fafaf8",transition:"border-color 0.2s"}}>
                              <span style={{fontSize:32}}>📷</span>
                              <span style={{fontSize:12,fontWeight:700,color:C.muted}}>Tap to upload food photo</span>
                              <span style={{fontSize:10,color:C.muted}}>JPG, PNG up to 2MB</span>
                              <input id="food-img-upload" type="file" accept="image/*" style={{display:"none"}}
                                onChange={e=>{
                                  const file=e.target.files[0];
                                  if(!file) return;
                                  if(file.size>2*1024*1024){showToast("Image too large — max 2MB");return;}
                                  const reader=new FileReader();
                                  reader.onload=ev=>setNewImg(ev.target.result);
                                  reader.readAsDataURL(file);
                                }}
                              />
                            </label>
                          )}
                        </div>
                        <button onClick={addNewItem} style={{background:`linear-gradient(135deg,${C.pri},${C.amb})`,border:"none",borderRadius:12,padding:"13px",color:"white",fontWeight:900,fontSize:14,cursor:"pointer",boxShadow:"0 6px 18px rgba(200,54,10,0.35)",marginTop:4}}>
                          ✅ Add to Menu
                        </button>
                      </div>
                    </div>
                    {menuItems.length>INITIAL_ITEMS.length&&(
                      <div style={{marginTop:16}}>
                        <div style={{fontSize:11,fontWeight:800,color:C.muted,letterSpacing:0.5,marginBottom:9}}>ADDED ITEMS ({menuItems.length-INITIAL_ITEMS.length})</div>
                        {menuItems.slice(INITIAL_ITEMS.length).map(item=>(
                          <div key={item.id} style={{background:"white",borderRadius:12,padding:"10px 12px",marginBottom:7,display:"flex",alignItems:"center",gap:10,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
                            <div style={{flex:1}}>
                              <div style={{fontFamily:"Georgia,serif",fontSize:13,fontWeight:800,color:C.text}}>{item.name}</div>
                              <div style={{fontSize:11,color:C.muted}}>₹{item.price} · {item.cat}{item.badge?` · ${item.badge}`:""}</div>
                            </div>
                            <button onClick={()=>{
                              const newM=menuItems.filter(i=>i.id!==item.id);
                              setMenuItems(newM);
                              syncMenuToStorage(newM);
                              setInventory(prev=>{const n={...prev};delete n[item.id];return n;});
                              showToast(`"${item.name}" removed`);
                            }}
                              style={{background:"none",border:`1.5px solid ${C.red}`,borderRadius:8,padding:"6px 10px",color:C.red,fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>Remove</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Ratings & Feedback Modal (outlet) ── */}
          {viewRatingsOrder&&(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
              <div style={{background:"white",borderRadius:20,width:"100%",maxWidth:360,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
                <div style={{textAlign:"center",marginBottom:16}}>
                  <div style={{fontSize:36,marginBottom:6}}>⭐</div>
                  <div style={{fontFamily:"Georgia,serif",fontSize:17,fontWeight:900,color:C.text}}>Rating & Feedback</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:3}}>Order #{viewRatingsOrder.id} · {viewRatingsOrder.name}</div>
                </div>
                <div style={{background:"#FFF7EF",borderRadius:14,padding:"14px 16px",marginBottom:14}}>
                  <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:8,letterSpacing:0.5}}>CUSTOMER RATING</div>
                  <div style={{display:"flex",gap:4,marginBottom:4}}>
                    {[1,2,3,4,5].map(n=>(
                      <span key={n} style={{fontSize:28,color:n<=viewRatingsOrder.rating?C.amb:"#E8DDD4"}}>★</span>
                    ))}
                    <span style={{fontSize:14,fontWeight:800,color:C.text,marginLeft:6,alignSelf:"center"}}>{viewRatingsOrder.rating}/5</span>
                  </div>
                </div>
                {viewRatingsOrder.feedback?(
                  <div style={{background:"#f9f4ef",borderRadius:14,padding:"13px 16px",marginBottom:14}}>
                    <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:6,letterSpacing:0.5}}>CUSTOMER FEEDBACK</div>
                    <div style={{fontSize:13,color:C.text,lineHeight:1.6,fontStyle:"italic"}}>"{viewRatingsOrder.feedback}"</div>
                  </div>
                ):(
                  <div style={{background:"#f9f4ef",borderRadius:14,padding:"11px 14px",marginBottom:14,textAlign:"center"}}>
                    <div style={{fontSize:12,color:C.muted}}>No written feedback provided</div>
                  </div>
                )}
                <button onClick={()=>setViewRatingsOrder(null)} style={{width:"100%",background:`linear-gradient(135deg,${C.pri},${C.amb})`,border:"none",borderRadius:12,padding:12,color:"white",fontWeight:800,fontSize:14,cursor:"pointer"}}>Close</button>
              </div>
            </div>
          )}

          {/* ── Order Milestone Celebration (customer every 5th order) ── */}
          {loggedIn&&loginType==="customer"&&myHistory.length>0&&myHistory.length%5===0&&custScreen==="tracking"&&trackStatus==="ready"&&(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:201,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(3px)"}}>
              <div style={{background:"white",borderRadius:24,padding:"32px 24px",width:"100%",maxWidth:340,textAlign:"center",boxShadow:"0 24px 60px rgba(0,0,0,0.3)"}}>
                <div style={{fontSize:60,marginBottom:8}}>🎉</div>
                <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:12}}>
                  {["🍔","⭐","🔥","🎊","✨"].map((e,i)=><span key={i} style={{fontSize:20,animation:`pop 0.5s ${i*0.1}s both`}}>{e}</span>)}
                </div>
                <div style={{fontFamily:"Georgia,serif",fontSize:22,fontWeight:900,color:C.pri,marginBottom:8}}>
                  Thank you for your<br/><span style={{color:C.amb}}>{myHistory.length}{myHistory.length===1?"st":myHistory.length===2?"nd":myHistory.length===3?"rd":"th"} Order!</span>
                </div>
                <div style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:20}}>
                  You've been an amazing customer! 🙏<br/>
                  We truly appreciate your loyalty to QuickBites.
                </div>
                <div style={{background:`linear-gradient(135deg,rgba(200,54,10,0.08),rgba(245,146,28,0.08))`,border:`1.5px dashed ${C.bdr}`,borderRadius:14,padding:"12px 16px",marginBottom:18}}>
                  <div style={{fontSize:12,color:C.text,fontWeight:700}}>🌿 100% Hygienic &amp; Fresh · Pure Veg</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:3}}>Keep ordering — more milestones ahead!</div>
                </div>
                <button
                  onClick={()=>{setCart({});setCustScreen("menu");setActiveOrderId(null);setPayMethod("");setUpiPaid(false);setShowRating(true);setSecs(25*60);}}
                  style={{width:"100%",background:`linear-gradient(135deg,${C.pri},${C.amb})`,border:"none",borderRadius:14,padding:"14px",color:"white",fontWeight:900,fontSize:15,cursor:"pointer",boxShadow:`0 8px 24px rgba(200,54,10,0.4)`}}>
                  🍔 Order Again!
                </button>
              </div>
            </div>
          )}

                    {/* ── Logout Confirmation Modal ── */}
          {showLogoutConfirm&&(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:24,backdropFilter:"blur(2px)"}}>
              <div style={{background:"white",borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:320,boxShadow:"0 20px 60px rgba(0,0,0,0.25)",textAlign:"center"}}>
                <div style={{fontSize:44,marginBottom:12}}>👋</div>
                <div style={{fontFamily:"Georgia,serif",fontSize:18,fontWeight:900,color:C.dark,marginBottom:8}}>Logging out?</div>
                <div style={{fontSize:13,color:C.muted,marginBottom:24,lineHeight:1.5}}>
                  {loginType==="outlet"
                    ? "You won't receive new order alerts while logged out."
                    : "Your cart will be cleared if you log out now."}
                </div>
                <div style={{display:"flex",gap:10}}>
                  <button
                    onClick={()=>setShowLogoutConfirm(false)}
                    style={{flex:1,background:C.bg,border:`1.5px solid ${C.bdr}`,borderRadius:12,padding:"12px",fontSize:14,fontWeight:700,color:C.text,cursor:"pointer"}}>
                    Cancel
                  </button>
                  <button
                    onClick={doLogout}
                    style={{flex:1,background:`linear-gradient(135deg,${C.red},#C62828)`,border:"none",borderRadius:12,padding:"12px",fontSize:14,fontWeight:800,color:"white",cursor:"pointer",boxShadow:"0 4px 14px rgba(198,40,40,0.35)"}}>
                    Yes, Logout
                  </button>
                </div>
              </div>
            </div>
          )}

          
          {/* ── QB-Bito Floating Chat Button (customer only) ── */}
          {loggedIn&&loginType==="customer"&&custScreen==="menu"&&(
            <>
              {/* Floating button */}
              {!chatOpen&&(
                <button onClick={()=>setChatOpen(true)} style={{position:"fixed",bottom:90,right:16,width:52,height:52,borderRadius:16,background:`linear-gradient(135deg,${C.pri},${C.amb})`,border:"none",boxShadow:"0 6px 20px rgba(200,54,10,0.45)",cursor:"pointer",zIndex:80,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,animation:"pop 0.3s ease"}}>
                  🍔
                </button>
              )}
              {/* Chat overlay */}
              {chatOpen&&(
                <div style={{position:"fixed",bottom:80,right:10,width:310,height:420,background:"white",borderRadius:20,boxShadow:"0 12px 40px rgba(0,0,0,0.22)",zIndex:200,display:"flex",flexDirection:"column",overflow:"hidden",border:`1.5px solid ${C.bdr}`}}>
                  {/* Header */}
                  <div style={{background:`linear-gradient(135deg,${C.pri},${C.amb})`,padding:"12px 14px",display:"flex",alignItems:"center",gap:9,flexShrink:0}}>
                    <div style={{width:32,height:32,borderRadius:10,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🍔</div>
                    <div style={{flex:1}}>
                      <div style={{color:"white",fontWeight:900,fontSize:13}}>QB-Bito</div>
                      <div style={{color:"rgba(255,255,255,0.7)",fontSize:10}}>{chatBusy?"typing...":"QuickBites AI Helper"}</div>
                    </div>
                    <button onClick={()=>setChatOpen(false)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,width:28,height:28,color:"white",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                  </div>
                  {/* FAQ chips */}
                  <div style={{padding:"8px 10px 4px",overflowX:"auto",scrollbarWidth:"none",flexShrink:0}}>
                    <div style={{display:"flex",gap:6}}>
                      {["Menu & prices?","Timings?","How to pay?","Track order?","Bestseller?"].map(q=>(
                        <button key={q} onClick={()=>{
                          const um={r:"user",t:q};
                          const next=[...chatMsgs,um];
                          setChatMsgs(next);
                          sendBito(q,next);
                        }} style={{flexShrink:0,background:C.bg,border:`1px solid ${C.bdr}`,borderRadius:12,padding:"5px 10px",fontSize:10,fontWeight:700,color:C.text,cursor:"pointer",whiteSpace:"nowrap"}}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Messages */}
                  <div style={{flex:1,overflowY:"auto",padding:"8px 10px",display:"flex",flexDirection:"column",gap:8,scrollbarWidth:"none"}}>
                    {chatMsgs.map((msg,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:msg.r==="user"?"flex-end":"flex-start",gap:6,alignItems:"flex-end"}}>
                        {msg.r==="bot"&&<div style={{width:24,height:24,borderRadius:7,background:`linear-gradient(135deg,${C.pri},${C.amb})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0}}>🍔</div>}
                        <div style={{maxWidth:"78%",padding:"8px 11px",borderRadius:msg.r==="user"?"12px 12px 3px 12px":"12px 12px 12px 3px",background:msg.r==="user"?`linear-gradient(135deg,${C.pri},${C.amb})`:"#f5ede3",color:msg.r==="user"?"white":C.text,fontSize:12,lineHeight:1.5}}>
                          {msg.t.split("*").map((p,j)=>j%2===1?<b key={j}>{p}</b>:p)}
                        </div>
                      </div>
                    ))}
                    {chatBusy&&(
                      <div style={{display:"flex",gap:6,alignItems:"flex-end"}}>
                        <div style={{width:24,height:24,borderRadius:7,background:`linear-gradient(135deg,${C.pri},${C.amb})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>🍔</div>
                        <div style={{background:"#f5ede3",borderRadius:"12px 12px 12px 3px",padding:"10px 14px",display:"flex",gap:4}}>
                          <div style={{width:6,height:6,borderRadius:"50%",background:C.pri,animation:"blink 1s 0s infinite"}}/>
                          <div style={{width:6,height:6,borderRadius:"50%",background:C.pri,animation:"blink 1s 0.2s infinite"}}/>
                          <div style={{width:6,height:6,borderRadius:"50%",background:C.pri,animation:"blink 1s 0.4s infinite"}}/>
                        </div>
                      </div>
                    )}
                    <div ref={chatBottom}/>
                  </div>
                  {/* Input */}
                  <div style={{padding:"8px 10px",borderTop:`1px solid ${C.bdr}`,display:"flex",gap:7,flexShrink:0}}>
                    <input key="bito-in" placeholder="Ask anything..." value={chatIn} onChange={e=>setChatIn(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"&&chatIn.trim()&&!chatBusy){const q=chatIn.trim();const um={r:"user",t:q};const next=[...chatMsgs,um];setChatMsgs(next);setChatIn("");sendBito(q,next);}}}
                      style={{flex:1,padding:"8px 11px",borderRadius:10,border:`1.5px solid ${C.bdr}`,fontSize:12,outline:"none",fontFamily:"inherit",color:C.text,background:"#fafaf8",minWidth:0,boxSizing:"border-box"}}/>
                    <button onClick={()=>{if(chatIn.trim()&&!chatBusy){const q=chatIn.trim();const um={r:"user",t:q};const next=[...chatMsgs,um];setChatMsgs(next);setChatIn("");sendBito(q,next);}}}
                      disabled={!chatIn.trim()||chatBusy}
                      style={{width:34,height:34,borderRadius:9,background:chatIn.trim()&&!chatBusy?`linear-gradient(135deg,${C.pri},${C.amb})`:"#ddd",border:"none",color:"white",cursor:chatIn.trim()&&!chatBusy?"pointer":"not-allowed",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>➤</button>
                  </div>
                </div>
              )}
            </>
          )}

          {toast&&<div style={{position:"fixed",bottom:74,left:"50%",transform:"translateX(-50%)",background:"rgba(27,8,0,0.92)",color:"white",padding:"9px 18px",borderRadius:20,fontSize:12,fontWeight:700,zIndex:999,whiteSpace:"nowrap",letterSpacing:0.2,maxWidth:"90%",textAlign:"center"}}>{toast}</div>}
          {invoiceOrder&&<InvoiceModal order={invoiceOrder} onClose={()=>setInvoiceOrder(null)}/>}
        </div>
      </div>
    </>
  );
}
