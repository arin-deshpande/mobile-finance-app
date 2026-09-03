import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView
} from 'react-native';

const FINNHUB_API_KEY = 'd4dcf8hr01qovljp44fgd4dcf8hr01qovljp44g0';

async function fetchQuote(symbol) {
  const trimmedSymbol = symbol.trim().toUpperCase();
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(trimmedSymbol)}&token=${FINNHUB_API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  const data = await response.json();
  return { symbol: trimmedSymbol, data };
}

async function fetchSuggestions(query) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return { result: [] };

  const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(trimmedQuery)}&token=${FINNHUB_API_KEY}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch suggestions');
  }

  const data = await response.json();
  return data; // { count, result: [...] }
}

export default function App() {
  const [query, setQuery] = useState('');
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  const handleSearch = async (symbolOverride) => {
    const term = (symbolOverride ?? query).trim();
    if (!term) return;

    try {
      setLoading(true);
      setError(null);

      const { symbol, data } = await fetchQuote(term);

      // Finnhub quote returns numbers like c (current), d (change), dp (percent), pc (previous close)
      if (typeof data.c !== 'number' || data.c === 0) {
        setError('No data found for that symbol. Try something like AAPL or TSLA.');
        return;
      }

      const newQuote = {
        symbol,
        current: data.c,
        change: data.d,
        percent: data.dp,
        prevClose: data.pc,
      };

      // Add this stock to the top of the list, removing any previous entry for the same symbol
      setQuotes((prev) => [
        newQuote,
        ...prev.filter((q) => q.symbol !== symbol),
      ]);
    } catch (e) {
      setError('Failed to load data. Please check your connection or API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (symbolToRemove) => {
    setQuotes((prev) => prev.filter((q) => q.symbol !== symbolToRemove));
  };

  const handleChangeText = async (text) => {
    setQuery(text);

    const trimmed = text.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }

    try {
      const data = await fetchSuggestions(trimmed);
      const cleaned = (data.result || [])
        .filter((item) => item.symbol && item.description)
        .slice(0, 5);
      setSuggestions(cleaned);
    } catch (e) {
      // If suggestions fail, just clear them silently
      setSuggestions([]);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces
          alwaysBounceVertical
          overScrollMode="always"
          keyboardShouldPersistTaps="handled"
        >
          <StatusBar style="auto" />
          <Text style={styles.header}>ƒinatics</Text>
          <Text style={styles.popular}></Text>
          <TextInput
            style={styles.basicInput}
            placeholder="Add a financial instrument here.."
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={handleChangeText}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
          />
          {suggestions.length > 0 && !loading && (
            <View style={styles.suggestionsBox}>
              {suggestions.map((item) => (
                <TouchableOpacity
                  key={item.symbol}
                  style={styles.suggestionRow}
                  onPress={() => {
                    const sym = item.symbol;
                    setQuery(sym);
                    setSuggestions([]);
                    handleSearch(sym);
                  }}
                >
                  <Text style={styles.suggestionSymbol}>{item.symbol}</Text>
                  <Text style={styles.suggestionDescription} numberOfLines={1}>
                    {item.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {loading && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" />
              <Text style={styles.loadingText}>Fetching latest quote...</Text>
            </View>
          )}

          {error && !loading && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!loading && !error && quotes.length === 0 && (
            <Text style={styles.empty}>
              Type a ticker symbol (e.g. AAPL, TSLA) and press enter to see its latest price.
            </Text>
          )}

          {!loading && quotes.length > 0 && (
            <View>
              {quotes.map((quote) => (
                <View key={quote.symbol} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <View>
                      <Text style={styles.symbol}>{quote.symbol}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.price}>${quote.current.toFixed(2)}</Text>
                      <Text
                        style={[
                          styles.change,
                          quote.change >= 0 ? styles.up : styles.down,
                        ]}
                      >
                        {quote.change >= 0 ? '+' : ''}
                        {quote.change.toFixed(2)} ({quote.percent.toFixed(2)}%)
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemove(quote.symbol)}
                  >
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f17',
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  // //The subheading (popular)
  popular: {
    fontSize: 10,
    color: '#57fa05',
    marginTop: 8,
    textAlign: 'center'
  },
  //The main thing
  header: {
    fontSize: 60,
    fontWeight: '800',
    color: '#57fa05',
    marginBottom: 100,
    marginTop: 10,
    textAlign: 'center'
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#1a2233',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#e6ecff',
  },
  addBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  loadingText: { color: '#c7d2fe' },
  errorBox: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  errorText: { color: '#fff' },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  symbol: { color: '#e5e7eb', fontWeight: '800', fontSize: 18 },
  name: { color: '#94a3b8', marginTop: 2, maxWidth: 220 },
  price: { color: '#f8fafc', fontSize: 18, fontWeight: '700' },
  priceMuted: { color: '#94a3b8' },
  change: { marginTop: 2, fontWeight: '700' },
  changeMuted: { color: '#94a3b8', marginTop: 2 },
  up: { color: '#22c55e' },
  down: { color: '#ef4444' },
  marketState: { color: '#64748b', marginTop: 2, fontSize: 12 },
  empty: { color: '#57fa05', textAlign: 'center', marginTop: -7, fontSize: 16 },
  footer: { color: '#475569', textAlign: 'center', marginBottom: 16 },
  basicInput: {
    backgroundColor: '#1a2233',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#e6ecff',
    marginTop: -110,
    marginBottom: 16,
  },
  removeBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1f2937',
  },
  removeBtnText: {
    color: '#f97373',
    fontWeight: '600',
    fontSize: 12,
  },
  suggestionsBox: {
    backgroundColor: '#020617',
    borderRadius: 10,
    marginBottom: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  suggestionSymbol: {
    color: '#e5e7eb',
    fontWeight: '700',
    fontSize: 14,
    minWidth: 64,
  },
  suggestionDescription: {
    color: '#94a3b8',
    fontSize: 12,
    flexShrink: 1,
  }
});