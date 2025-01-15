import { useState, useEffect } from "react";
import { Text, View, ScrollView, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { supabase } from "../lib/supabase";
import { searchRegulations } from "../lib/openai";

interface Regulation {
  id: number;
  title: string;
  content: string;
  relevance?: number;
}

export default function Index() {
  const [data, setData] = useState<Regulation[]>([]);
  const [filteredData, setFilteredData] = useState<Regulation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setFilteredData(data);
      return;
    }

    try {
      setSearching(true);
      setError(null);
      const searchResults = await searchRegulations(searchQuery, data);
      setFilteredData(searchResults);
    } catch (error) {
      console.error("検索エラー:", error);
      setError("検索処理に失敗しました。");
    } finally {
      setSearching(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: regulationsData, error: fetchError } = await supabase
        .from("regulations")
        .select("*")
        .limit(100);

      if (fetchError) {
        throw fetchError;
      }

      if (regulationsData) {
        console.log("取得したデータ:", regulationsData.length, "件");
        setData(regulationsData);
        setFilteredData(regulationsData);
      }
    } catch (error) {
      console.error("データ取得エラー:", error);
      setError("データの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>データを読み込み中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "red" }}>{error}</Text>
        <Text onPress={fetchData} style={{ color: "blue", marginTop: 10 }}>
          再試行
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="条例について質問してください（例：練馬区の道路に関する条例を教えて）"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={searching}
        >
          {searching ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>検索</Text>
          )}
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {filteredData.map((item) => (
          <View
            key={item.id}
            style={[
              styles.card,
              item.relevance ? { borderColor: `rgba(0, 122, 255, ${item.relevance})` } : undefined
            ]}
          >
            <Text style={styles.cardTitle}>
              {item.title || "タイトルなし"}
            </Text>
            <Text style={styles.cardContent}>
              {item.content || "内容なし"}
            </Text>
            {item.relevance && (
              <Text style={styles.relevanceScore}>
                関連度: {Math.round(item.relevance * 100)}%
              </Text>
            )}
          </View>
        ))}
        {filteredData.length === 0 && (
          <Text style={styles.noResults}>
            検索結果が見つかりませんでした。別の言葉で試してみてください。
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    padding: 10,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: "#007AFF",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 80,
    alignItems: "center",
  },
  searchButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  card: {
    padding: 15,
    marginBottom: 10,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  cardContent: {
    fontSize: 14,
    color: "#666",
  },
  relevanceScore: {
    marginTop: 8,
    fontSize: 12,
    color: "#007AFF",
    textAlign: "right",
  },
  noResults: {
    textAlign: "center",
    color: "#666",
    marginTop: 20,
  },
});
