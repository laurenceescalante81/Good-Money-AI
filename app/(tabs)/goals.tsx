import React, { useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, Alert, TextInput, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useFinance, SavingsGoal } from "@/contexts/FinanceContext";

function formatCurrency(amount: number): string {
  return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const GOAL_ICONS: Record<string, string> = {
  "airplane-outline": "Travel",
  "home-outline": "Home",
  "car-outline": "Car",
  "school-outline": "Education",
  "medkit-outline": "Emergency",
  "gift-outline": "Gift",
  "diamond-outline": "Luxury",
  "fitness-outline": "Health",
  "laptop-outline": "Tech",
  "cash-outline": "Savings",
};

function GoalCard({ goal, onAdd, onDelete }: {
  goal: SavingsGoal; onAdd: (id: string) => void; onDelete: (id: string) => void;
}) {
  const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  const daysLeft = Math.max(0, Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <Pressable
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert("Delete Goal", `Remove "${goal.name}"?`, [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => onDelete(goal.id) },
        ]);
      }}
      style={styles.goalCard}
    >
      <View style={styles.goalHeader}>
        <View style={styles.goalIconWrap}>
          <Ionicons name={goal.icon as any} size={22} color={Colors.light.goal} />
        </View>
        <View style={styles.goalInfo}>
          <Text style={styles.goalName}>{goal.name}</Text>
          <Text style={styles.goalDays}>{daysLeft > 0 ? `${daysLeft} days left` : "Past target date"}</Text>
        </View>
        <Text style={styles.goalPct}>{Math.round(pct)}%</Text>
      </View>

      <View style={styles.goalBarBg}>
        <View style={[styles.goalBarFill, { width: `${Math.min(pct, 100)}%` }]} />
      </View>

      <View style={styles.goalFooter}>
        <Text style={styles.goalSaved}>{formatCurrency(goal.currentAmount)}</Text>
        <Text style={styles.goalTarget}>of {formatCurrency(goal.targetAmount)}</Text>
      </View>

      <Pressable
        onPress={() => onAdd(goal.id)}
        style={({ pressed }) => [styles.goalAddBtn, pressed && { opacity: 0.8 }]}
      >
        <Ionicons name="add" size={18} color={Colors.light.white} />
        <Text style={styles.goalAddText}>Add Funds</Text>
      </Pressable>
    </Pressable>
  );
}

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { goals, updateGoalAmount, deleteGoal } = useFinance();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState("");

  const handleAddFunds = (id: string) => {
    setSelectedGoalId(id);
    setFundAmount("");
    setAddModalVisible(true);
  };

  const confirmAddFunds = () => {
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0 || !selectedGoalId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateGoalAmount(selectedGoalId, amount);
    setAddModalVisible(false);
  };

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);

  return (
    <View style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <Text style={styles.title}>Goals</Text>
          <Pressable onPress={() => router.push("/add-goal")} hitSlop={12}>
            <Ionicons name="add-circle" size={28} color={Colors.light.tint} />
          </Pressable>
        </View>

        {goals.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>Total Saved</Text>
                <Text style={styles.summaryAmount}>{formatCurrency(totalSaved)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" as const }}>
                <Text style={styles.summaryLabel}>Target</Text>
                <Text style={styles.summaryTarget}>{formatCurrency(totalTarget)}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.body}>
          {goals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flag-outline" size={48} color={Colors.light.gray300} />
              <Text style={styles.emptyText}>No savings goals</Text>
              <Text style={styles.emptySubtext}>Set a goal and start saving towards it</Text>
              <Pressable
                style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.9 }]}
                onPress={() => router.push("/add-goal")}
              >
                <Text style={styles.emptyBtnText}>Create Goal</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.goalList}>
              {goals.map(g => (
                <GoalCard key={g.id} goal={g} onAdd={handleAddFunds} onDelete={deleteGoal} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={addModalVisible} transparent animationType="fade" onRequestClose={() => setAddModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAddModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Add Funds</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Amount"
              placeholderTextColor={Colors.light.textMuted}
              keyboardType="decimal-pad"
              value={fundAmount}
              onChangeText={setFundAmount}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <Pressable style={styles.modalCancel} onPress={() => setAddModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirm, (!fundAmount || parseFloat(fundAmount) <= 0) && { opacity: 0.5 }]}
                onPress={confirmAddFunds}
                disabled={!fundAmount || parseFloat(fundAmount) <= 0}
              >
                <Text style={styles.modalConfirmText}>Add</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
  title: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.light.text },
  summaryCard: { marginHorizontal: 20, backgroundColor: Colors.light.card, borderRadius: 16, padding: 16, marginBottom: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.light.textMuted, marginBottom: 4 },
  summaryAmount: { fontFamily: "DMSans_700Bold", fontSize: 24, color: Colors.light.goal },
  summaryTarget: { fontFamily: "DMSans_600SemiBold", fontSize: 18, color: Colors.light.textSecondary },
  body: { paddingHorizontal: 20, paddingTop: 12 },
  goalList: { gap: 12 },
  goalCard: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 16 },
  goalHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  goalIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.light.goal + "15", alignItems: "center", justifyContent: "center" },
  goalInfo: { flex: 1 },
  goalName: { fontFamily: "DMSans_600SemiBold", fontSize: 16, color: Colors.light.text },
  goalDays: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted, marginTop: 2 },
  goalPct: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.light.goal },
  goalBarBg: { height: 8, backgroundColor: Colors.light.gray100, borderRadius: 4, overflow: "hidden" },
  goalBarFill: { height: 8, borderRadius: 4, backgroundColor: Colors.light.goal },
  goalFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  goalSaved: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.text },
  goalTarget: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.light.textMuted },
  goalAddBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: Colors.light.goal, paddingVertical: 10, borderRadius: 10, marginTop: 12 },
  goalAddText: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: Colors.light.white },
  emptyState: { alignItems: "center", paddingVertical: 48, backgroundColor: Colors.light.card, borderRadius: 16 },
  emptyText: { fontFamily: "DMSans_600SemiBold", fontSize: 16, color: Colors.light.textSecondary, marginTop: 16 },
  emptySubtext: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.light.textMuted, marginTop: 4, textAlign: "center", paddingHorizontal: 40 },
  emptyBtn: { marginTop: 20, backgroundColor: Colors.light.goal, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  emptyBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.white },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: Colors.light.card, borderRadius: 20, padding: 24, width: "85%", maxWidth: 340 },
  modalTitle: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.light.text, marginBottom: 16, textAlign: "center" },
  modalInput: { fontFamily: "DMSans_500Medium", fontSize: 24, color: Colors.light.text, borderBottomWidth: 2, borderBottomColor: Colors.light.goal, paddingVertical: 8, textAlign: "center", marginBottom: 20 },
  modalBtns: { flexDirection: "row", gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.light.gray100, alignItems: "center" },
  modalCancelText: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.textSecondary },
  modalConfirm: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.light.goal, alignItems: "center" },
  modalConfirmText: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.white },
});
