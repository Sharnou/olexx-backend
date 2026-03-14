import React, { useMemo, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Text, TextInput, TouchableOpacity, FlatList } from "react-native";
import { StatusBar } from "expo-status-bar";

const Stack = createNativeStackNavigator();

function useApi(baseDefault) {
  const [base, setBase] = useState(baseDefault);
  const headers = { "Content-Type": "application/json" };
  const authHeaders = (token) => Object.assign({}, headers, token ? { Authorization: "Bearer " + token } : {});
  return {
    base,
    setBase,
    register: (payload) => fetch(base + "/api/auth/register", { method: "POST", headers, body: JSON.stringify(payload) }).then((r) => r.json()),
    login: (payload) => fetch(base + "/api/auth/login", { method: "POST", headers, body: JSON.stringify(payload) }).then((r) => r.json()),
    me: (t) => fetch(base + "/api/auth/me", { headers: authHeaders(t) }).then((r) => r.json()),
    classify: (title) => fetch(base + "/api/classify", { method: "POST", headers, body: JSON.stringify({ title }) }).then((r) => r.json()),
    createListing: (t, doc) => fetch(base + "/api/listings", { method: "POST", headers: authHeaders(t), body: JSON.stringify(doc) }).then((r) => r.json()),
    myListings: (t) => fetch(base + "/api/listings/mine", { headers: authHeaders(t) }).then((r) => r.json()),
    search: (q) => fetch(base + "/api/search", { method: "POST", headers, body: JSON.stringify(q) }).then((r) => r.json()),
    savedAdd: (t, name, query) => fetch(base + "/api/saved-searches", { method: "POST", headers: authHeaders(t), body: JSON.stringify({ name, query }) }).then((r) => r.json()),
    savedList: (t) => fetch(base + "/api/saved-searches", { headers: authHeaders(t) }).then((r) => r.json()),
    favAdd: (t, id) => fetch(base + "/api/favorites", { method: "POST", headers: authHeaders(t), body: JSON.stringify({ listingId: id }) }).then((r) => r.json()),
    favList: (t) => fetch(base + "/api/favorites", { headers: authHeaders(t) }).then((r) => r.json()),
    chatSend: (from, to, text) => fetch(base + "/api/chat/send", { method: "POST", headers, body: JSON.stringify({ from, to, text }) }).then((r) => r.json()),
    chatThread: (a, b) => fetch(base + "/api/chat/thread?userA=" + encodeURIComponent(a) + "&userB=" + encodeURIComponent(b), { headers }).then((r) => r.json()),
  };
}

function ScreenContainer({ children }) {
  return <View style={{ flex: 1, padding: 16 }}>{children}</View>;
}

function Button({ title, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ backgroundColor: "#0e7afe", padding: 12, borderRadius: 6, marginVertical: 6 }}>
      <Text style={{ color: "white", textAlign: "center", fontWeight: "600" }}>{title}</Text>
    </TouchableOpacity>
  );
}

function Input(props) {
  return <TextInput {...props} style={[{ borderWidth: 1, borderColor: "#ddd", padding: 10, borderRadius: 6, marginVertical: 6 }, props.style]} />;
}

function Home({ navigation }) {
  const [base, setBase] = useState("http://localhost:3000");
  return (
    <ScreenContainer>
      <Text style={{ fontSize: 28, fontWeight: "700" }}>OLEXX</Text>
      <Input value={base} onChangeText={setBase} placeholder="Backend URL" />
      <Button title="Auth" onPress={() => navigation.navigate("Auth", { base })} />
      <Button title="Post Listing" onPress={() => navigation.navigate("Post", { base })} />
      <Button title="Search" onPress={() => navigation.navigate("Search", { base })} />
      <Button title="Favorites & Saved" onPress={() => navigation.navigate("Saved", { base })} />
      <Button title="Chat" onPress={() => navigation.navigate("Chat", { base })} />
      <StatusBar style="auto" />
    </ScreenContainer>
  );
}

function Auth({ route }) {
  const api = useApi(route.params.base);
  const [method, setMethod] = useState("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState("facebook");
  const [providerId, setProviderId] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [me, setMe] = useState(null);
  function payload() {
    if (method === "email") return { method, email, name };
    if (method === "phone") return { method, phone, name };
    return { method, provider, providerId, name };
  }
  return (
    <ScreenContainer>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Auth</Text>
      <Input placeholder="method: email|phone|social" value={method} onChangeText={setMethod} />
      {method === "email" ? <Input placeholder="email" value={email} onChangeText={setEmail} /> : null}
      {method === "phone" ? <Input placeholder="phone" value={phone} onChangeText={setPhone} /> : null}
      {method === "social" ? <Input placeholder="provider" value={provider} onChangeText={setProvider} /> : null}
      {method === "social" ? <Input placeholder="providerId" value={providerId} onChangeText={setProviderId} /> : null}
      <Input placeholder="name" value={name} onChangeText={setName} />
      <Button title="Register" onPress={async () => { const r = await api.register(payload()); setToken(r.token || ""); }} />
      <Button title="Login" onPress={async () => { const r = await api.login(payload()); setToken(r.token || ""); }} />
      <Input placeholder="token" value={token} onChangeText={setToken} />
      <Button title="Me" onPress={async () => { const r = await api.me(token); setMe(r); }} />
      <Text selectable>{JSON.stringify(me)}</Text>
    </ScreenContainer>
  );
}

function Post({ route }) {
  const api = useApi(route.params.base);
  const [token, setToken] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [attrs, setAttrs] = useState("{}");
  const [price, setPrice] = useState("");
  const [last, setLast] = useState(null);
  return (
    <ScreenContainer>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Post Listing</Text>
      <Input placeholder="token" value={token} onChangeText={setToken} />
      <Input placeholder="title" value={title} onChangeText={setTitle} />
      <Button title="Classify" onPress={async () => { const r = await api.classify(title); setCategory(JSON.stringify(r.category || {})); setAttrs(JSON.stringify(r.attributes || {}, null, 0)); }} />
      <Input placeholder='category {"l1":"Electronics","l2":"Mobile Phones"}' value={category} onChangeText={setCategory} />
      <Input placeholder='attributes {"Brand":"Apple"}' value={attrs} onChangeText={setAttrs} />
      <Input placeholder="price" value={price} onChangeText={setPrice} />
      <Button title="Create" onPress={async () => {
        let cat = null; let a = null;
        try { cat = JSON.parse(category); } catch {}
        try { a = JSON.parse(attrs); } catch {}
        const r = await api.createListing(token, { title, category: cat, attributes: a, price: Number(price) });
        setLast(r);
      }} />
      <Button title="My Listings" onPress={async () => { const r = await api.myListings(token); setLast(r); }} />
      <Text selectable>{JSON.stringify(last)}</Text>
    </ScreenContainer>
  );
}

function Search({ route }) {
  const api = useApi(route.params.base);
  const [text, setText] = useState("");
  const [l1, setL1] = useState("");
  const [l2, setL2] = useState("");
  const [out, setOut] = useState(null);
  return (
    <ScreenContainer>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Search</Text>
      <Input placeholder="text" value={text} onChangeText={setText} />
      <Input placeholder="l1" value={l1} onChangeText={setL1} />
      <Input placeholder="l2" value={l2} onChangeText={setL2} />
      <Button title="Go" onPress={async () => { const r = await api.search({ text, l1: l1 || undefined, l2: l2 || undefined, page: 1, pageSize: 20 }); setOut(r); }} />
      <FlatList data={(out && out.items) || []} keyExtractor={(item) => item.id} renderItem={({ item }) => (
        <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
          <Text style={{ fontWeight: "600" }}>{item.title}</Text>
          <Text>{item.price !== undefined ? String(item.price) : ""}</Text>
        </View>
      )} />
    </ScreenContainer>
  );
}

function Saved({ route }) {
  const api = useApi(route.params.base);
  const [token, setToken] = useState("");
  const [name, setName] = useState("Search");
  const [query, setQuery] = useState('{"text":"iphone","l1":"Electronics"}');
  const [last, setLast] = useState(null);
  return (
    <ScreenContainer>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Saved & Favorites</Text>
      <Input placeholder="token" value={token} onChangeText={setToken} />
      <Input placeholder="name" value={name} onChangeText={setName} />
      <Input placeholder='query {"text":"iphone"}' value={query} onChangeText={setQuery} />
      <Button title="Save Search" onPress={async () => { let q = null; try { q = JSON.parse(query); } catch {} const r = await api.savedAdd(token, name, q); setLast(r); }} />
      <Button title="List Saved" onPress={async () => { const r = await api.savedList(token); setLast(r); }} />
      <Button title="Favorites" onPress={async () => { const r = await api.favList(token); setLast(r); }} />
      <Text selectable>{JSON.stringify(last)}</Text>
    </ScreenContainer>
  );
}

function Chat({ route }) {
  const api = useApi(route.params.base);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [out, setOut] = useState(null);
  return (
    <ScreenContainer>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Chat</Text>
      <Input placeholder="from" value={from} onChangeText={setFrom} />
      <Input placeholder="to" value={to} onChangeText={setTo} />
      <Input placeholder="text" value={text} onChangeText={setText} />
      <Button title="Send" onPress={async () => { const r = await api.chatSend(from, to, text); setOut(r); }} />
      <Button title="Thread" onPress={async () => { const r = await api.chatThread(from, to); setOut(r); }} />
      <Text selectable>{JSON.stringify(out)}</Text>
    </ScreenContainer>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Auth" component={Auth} />
        <Stack.Screen name="Post" component={Post} />
        <Stack.Screen name="Search" component={Search} />
        <Stack.Screen name="Saved" component={Saved} />
        <Stack.Screen name="Chat" component={Chat} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
