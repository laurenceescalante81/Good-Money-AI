import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View, ScrollView, Platform, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Line, Text as SvgText, Circle, Rect, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";
import Colors from "@/constants/colors";
import { useFinance } from "@/contexts/FinanceContext";

function fmt(n: number): string { return "$" + Math.abs(n).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function fmtK(n: number): string {
  if (Math.abs(n) >= 1000000) return "$" + (n / 1000000).toFixed(1) + "M";
  if (Math.abs(n) >= 1000) return "$" + (n / 1000).toFixed(0) + "K";
  return "$" + n.toFixed(0);
}

type TimeHorizon = "5yr" | "10yr" | "20yr" | "30yr";
const HORIZONS: { key: TimeHorizon; label: string; years: number }[] = [
  { key: "5yr", label: "5 Years", years: 5 },
  { key: "10yr", label: "10 Years", years: 10 },
  { key: "20yr", label: "20 Years", years: 20 },
  { key: "30yr", label: "30 Years", years: 30 },
];

export default function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const [selectedHorizon, setSelectedHorizon] = useState<TimeHorizon>("10yr");
  const { mortgage, superDetails, transactions, goals, insurancePolicies, getTotalIncome, getTotalExpenses, getTotalInsuranceCost, calculateMortgageRepayment, calculateSuperProjection } = useFinance();

  const screenW = Math.min(Dimensions.get("window").width - 40, 500);

  const monthlyIncome = getTotalIncome();
  const monthlyExpenses = getTotalExpenses();
  const mortgageCalc = calculateMortgageRepayment();
  const superProj = calculateSuperProjection();
  const insuranceCost = getTotalInsuranceCost() / 12;
  const monthlySavings = monthlyIncome - monthlyExpenses;
  const annualIncome = monthlyIncome * 12;
  const annualExpenses = monthlyExpenses * 12;

  const horizonYears = HORIZONS.find(h => h.key === selectedHorizon)?.years || 10;

  const wealthProjection = useMemo(() => {
    const points: { year: number; wealth: number; property: number; super_: number; savings: number }[] = [];
    const propertyValue = mortgage?.propertyValue || 0;
    const loanAmount = mortgage?.loanAmount || 0;
    const superBalance = superDetails?.balance || 0;
    const annualSuperContrib = superDetails ? superDetails.salary * (superDetails.employerRate / 100) : 0;
    const currentSavings = goals.reduce((s, g) => s + g.currentAmount, 0);
    const annualSavings = Math.max(0, monthlySavings * 12);
    const propertyGrowth = 0.04;
    const superGrowth = 0.07;
    const savingsGrowth = 0.04;
    const mortgageRate = mortgage ? mortgage.interestRate / 100 : 0;

    let propVal = propertyValue;
    let loanBal = loanAmount;
    let superBal = superBalance;
    let savBal = currentSavings;
    const annualMortgageRepay = mortgageCalc.monthly * 12;

    for (let y = 0; y <= horizonYears; y++) {
      const equity = propVal - loanBal;
      const totalWealth = equity + superBal + savBal;
      points.push({ year: y, wealth: totalWealth, property: equity, super_: superBal, savings: savBal });
      propVal *= (1 + propertyGrowth);
      if (loanBal > 0 && mortgage) {
        const interest = loanBal * mortgageRate;
        const principal = Math.min(loanBal, annualMortgageRepay - interest);
        loanBal = Math.max(0, loanBal - principal);
      }
      superBal = (superBal + annualSuperContrib) * (1 + superGrowth);
      savBal = (savBal + annualSavings) * (1 + savingsGrowth);
    }
    return points;
  }, [mortgage, superDetails, goals, monthlySavings, horizonYears, mortgageCalc.monthly]);

  const incomeExpenseData = useMemo(() => {
    const months: string[] = [];
    const incomes: number[] = [];
    const expenses: number[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push(d.toLocaleDateString("en-AU", { month: "short" }));
      const mTx = transactions.filter(t => t.date.startsWith(key));
      incomes.push(mTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0));
      expenses.push(mTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0));
    }
    return { months, incomes, expenses };
  }, [transactions]);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <Text style={styles.title}>Planning</Text>
          <View style={styles.headerRight}>
            <Ionicons name="analytics-outline" size={24} color={Colors.light.tint} />
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: Colors.light.tint + "12" }]}>
            <Text style={styles.summaryLabel}>Net Wealth</Text>
            <Text style={[styles.summaryVal, { color: Colors.light.tint }]}>
              {fmt(wealthProjection[0]?.wealth || 0)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: Colors.light.income + "12" }]}>
            <Text style={styles.summaryLabel}>Monthly Savings</Text>
            <Text style={[styles.summaryVal, { color: monthlySavings >= 0 ? Colors.light.income : Colors.light.expense }]}>
              {monthlySavings >= 0 ? "+" : "-"}{fmt(Math.abs(monthlySavings))}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Net Wealth Projection</Text>
          <View style={styles.horizonRow}>
            {HORIZONS.map(h => (
              <Pressable
                key={h.key}
                onPress={() => setSelectedHorizon(h.key)}
                style={[styles.horizonBtn, selectedHorizon === h.key && styles.horizonBtnActive]}
              >
                <Text style={[styles.horizonBtnText, selectedHorizon === h.key && styles.horizonBtnTextActive]}>
                  {h.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <NetWealthChart data={wealthProjection} width={screenW} />
          <View style={styles.legendRow}>
            <LegendDot color={Colors.light.tint} label="Net Wealth" />
            <LegendDot color={Colors.light.mortgage} label="Property" />
            <LegendDot color={Colors.light.super} label="Super" />
            <LegendDot color={Colors.light.income} label="Savings" />
          </View>
          <View style={styles.projectedCard}>
            <Text style={styles.projectedLabel}>Projected in {horizonYears} years</Text>
            <Text style={styles.projectedVal}>{fmt(wealthProjection[wealthProjection.length - 1]?.wealth || 0)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Income vs Expenses</Text>
          <Text style={styles.sectionSubtitle}>Last 6 months</Text>
          <IncomeExpenseChart data={incomeExpenseData} width={screenW} />
          <View style={styles.legendRow}>
            <LegendDot color={Colors.light.income} label="Income" />
            <LegendDot color={Colors.light.expense} label="Expenses" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wealth Breakdown</Text>
          <View style={styles.breakdownList}>
            <BreakdownRow icon="home-outline" label="Property Equity" value={wealthProjection[0]?.property || 0} color={Colors.light.mortgage} />
            <BreakdownRow icon="trending-up-outline" label="Superannuation" value={wealthProjection[0]?.super_ || 0} color={Colors.light.super} />
            <BreakdownRow icon="wallet-outline" label="Savings" value={wealthProjection[0]?.savings || 0} color={Colors.light.income} />
            {insuranceCost > 0 && <BreakdownRow icon="shield-outline" label="Insurance (monthly)" value={-insuranceCost} color={Colors.light.insurance} />}
            {mortgageCalc.monthly > 0 && <BreakdownRow icon="business-outline" label="Mortgage (monthly)" value={-mortgageCalc.monthly} color={Colors.light.expense} />}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function BreakdownRow({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <View style={styles.breakdownRow}>
      <View style={[styles.breakdownIcon, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={[styles.breakdownVal, { color: value >= 0 ? Colors.light.text : Colors.light.expense }]}>
        {value < 0 ? "-" : ""}{fmt(Math.abs(value))}
      </Text>
    </View>
  );
}

function NetWealthChart({ data, width }: { data: { year: number; wealth: number; property: number; super_: number; savings: number }[]; width: number }) {
  const chartH = 220;
  const padL = 55;
  const padR = 15;
  const padT = 20;
  const padB = 30;
  const chartW = width - padL - padR;
  const innerH = chartH - padT - padB;

  if (data.length < 2) {
    return (
      <View style={[styles.chartContainer, { height: chartH, width }]}>
        <Text style={styles.chartEmpty}>Add mortgage, super, or savings data to see projections</Text>
      </View>
    );
  }

  const allVals = data.flatMap(d => [d.wealth, d.property, d.super_, d.savings]);
  const maxVal = Math.max(...allVals, 1);
  const minVal = Math.min(...allVals, 0);
  const range = maxVal - minVal || 1;

  const toX = (i: number) => padL + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => padT + innerH - ((v - minVal) / range) * innerH;

  const makePath = (key: "wealth" | "property" | "super_" | "savings") =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(d[key]).toFixed(1)}`).join(" ");

  const makeAreaPath = (key: "wealth" | "property" | "super_" | "savings") => {
    const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(d[key]).toFixed(1)}`).join(" ");
    return `${line} L${toX(data.length - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${toX(0).toFixed(1)},${(padT + innerH).toFixed(1)} Z`;
  };

  const gridLines = 5;
  const gridVals = Array.from({ length: gridLines }, (_, i) => minVal + (range / (gridLines - 1)) * i);

  return (
    <View style={[styles.chartContainer, { width }]}>
      <Svg width={width} height={chartH}>
        <Defs>
          <SvgLinearGradient id="wealthFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.light.tint} stopOpacity="0.2" />
            <Stop offset="1" stopColor={Colors.light.tint} stopOpacity="0.02" />
          </SvgLinearGradient>
        </Defs>
        {gridVals.map((v, i) => (
          <React.Fragment key={i}>
            <Line x1={padL} y1={toY(v)} x2={width - padR} y2={toY(v)} stroke={Colors.light.gray200} strokeWidth={1} strokeDasharray="4,4" />
            <SvgText x={padL - 6} y={toY(v) + 4} fontSize={10} fill={Colors.light.textMuted} textAnchor="end" fontFamily="DMSans_500Medium">{fmtK(v)}</SvgText>
          </React.Fragment>
        ))}
        <Path d={makeAreaPath("wealth")} fill="url(#wealthFill)" />
        <Path d={makePath("savings")} fill="none" stroke={Colors.light.income} strokeWidth={1.5} strokeDasharray="4,3" />
        <Path d={makePath("super_")} fill="none" stroke={Colors.light.super} strokeWidth={1.5} strokeDasharray="4,3" />
        <Path d={makePath("property")} fill="none" stroke={Colors.light.mortgage} strokeWidth={1.5} strokeDasharray="4,3" />
        <Path d={makePath("wealth")} fill="none" stroke={Colors.light.tint} strokeWidth={2.5} />
        {data.filter((_, i) => i === 0 || i === data.length - 1).map((d, idx) => (
          <Circle key={idx} cx={toX(idx === 0 ? 0 : data.length - 1)} cy={toY(d.wealth)} r={4} fill={Colors.light.tint} stroke="#fff" strokeWidth={2} />
        ))}
        {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0 || i === data.length - 1).map((d, idx, arr) => {
          const origIdx = idx === arr.length - 1 && data.length > 1 ? data.length - 1 : idx * Math.max(1, Math.floor(data.length / 6));
          return (
            <SvgText key={idx} x={toX(origIdx)} y={chartH - 6} fontSize={10} fill={Colors.light.textMuted} textAnchor="middle" fontFamily="DMSans_500Medium">
              Yr {d.year}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

function IncomeExpenseChart({ data, width }: { data: { months: string[]; incomes: number[]; expenses: number[] }; width: number }) {
  const chartH = 180;
  const padL = 55;
  const padR = 15;
  const padT = 15;
  const padB = 30;
  const chartW = width - padL - padR;
  const innerH = chartH - padT - padB;

  const allVals = [...data.incomes, ...data.expenses];
  const maxVal = Math.max(...allVals, 1);

  if (maxVal === 0) {
    return (
      <View style={[styles.chartContainer, { height: chartH, width }]}>
        <Text style={styles.chartEmpty}>Add income and expense transactions to see trends</Text>
      </View>
    );
  }

  const barW = Math.min(18, chartW / data.months.length / 3);
  const gap = 3;

  const gridLines = 4;
  const gridVals = Array.from({ length: gridLines }, (_, i) => (maxVal / (gridLines - 1)) * i);

  const toY = (v: number) => padT + innerH - (v / maxVal) * innerH;

  return (
    <View style={[styles.chartContainer, { width }]}>
      <Svg width={width} height={chartH}>
        {gridVals.map((v, i) => (
          <React.Fragment key={i}>
            <Line x1={padL} y1={toY(v)} x2={width - padR} y2={toY(v)} stroke={Colors.light.gray200} strokeWidth={1} strokeDasharray="4,4" />
            <SvgText x={padL - 6} y={toY(v) + 4} fontSize={10} fill={Colors.light.textMuted} textAnchor="end" fontFamily="DMSans_500Medium">{fmtK(v)}</SvgText>
          </React.Fragment>
        ))}
        {data.months.map((month, i) => {
          const cx = padL + (i + 0.5) * (chartW / data.months.length);
          const incH = (data.incomes[i] / maxVal) * innerH;
          const expH = (data.expenses[i] / maxVal) * innerH;
          return (
            <React.Fragment key={i}>
              <Rect x={cx - barW - gap / 2} y={padT + innerH - incH} width={barW} height={Math.max(incH, 1)} rx={4} fill={Colors.light.income} opacity={0.8} />
              <Rect x={cx + gap / 2} y={padT + innerH - expH} width={barW} height={Math.max(expH, 1)} rx={4} fill={Colors.light.expense} opacity={0.8} />
              <SvgText x={cx} y={chartH - 6} fontSize={10} fill={Colors.light.textMuted} textAnchor="middle" fontFamily="DMSans_500Medium">{month}</SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 16 },
  title: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.light.text },
  headerRight: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.light.tint + "12", alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center" as const },
  summaryLabel: { fontFamily: "DMSans_500Medium", fontSize: 11, color: Colors.light.textSecondary },
  summaryVal: { fontFamily: "DMSans_700Bold", fontSize: 20, marginTop: 4 },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.light.text, marginBottom: 4 },
  sectionSubtitle: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted, marginBottom: 12 },
  horizonRow: { flexDirection: "row", gap: 6, marginBottom: 14, marginTop: 6 },
  horizonBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: Colors.light.gray100 },
  horizonBtnActive: { backgroundColor: Colors.light.tint },
  horizonBtnText: { fontFamily: "DMSans_500Medium", fontSize: 12, color: Colors.light.textSecondary },
  horizonBtnTextActive: { color: "#fff" },
  chartContainer: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 8, marginBottom: 12 },
  chartEmpty: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.light.textMuted, textAlign: "center", padding: 40 },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12, paddingHorizontal: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.light.textMuted },
  projectedCard: { backgroundColor: Colors.light.card, borderRadius: 14, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  projectedLabel: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.textSecondary },
  projectedVal: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.light.tint },
  breakdownList: { gap: 8 },
  breakdownRow: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.light.card, borderRadius: 14, padding: 14, gap: 12 },
  breakdownIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  breakdownLabel: { flex: 1, fontFamily: "DMSans_500Medium", fontSize: 14, color: Colors.light.text },
  breakdownVal: { fontFamily: "DMSans_700Bold", fontSize: 15 },
});
