import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView, Platform, Alert, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useFinance } from "@/contexts/FinanceContext";

function goBack() { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/rewards"); }

type SwitchType = 'mortgage' | 'super' | 'insurance' | 'bank';

interface SwitchOption {
  id: SwitchType;
  title: string;
  icon: string;
  iconBg: string;
  description: string;
  available: boolean;
  reason?: string;
}

export default function SwitchRequestScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { personalDetails, mortgage, superDetails, insurancePolicies } = useFinance();
  const [selectedType, setSelectedType] = useState<SwitchType | null>(null);
  const [generated, setGenerated] = useState(false);

  const hasName = !!(personalDetails.firstName && personalDetails.lastName);
  const hasAddress = !!(personalDetails.address.street && personalDetails.address.suburb && personalDetails.address.state && personalDetails.address.postcode);
  const hasContact = !!(personalDetails.email && personalDetails.phone);
  const hasBankDetails = !!(personalDetails.bsb && personalDetails.accountNumber);
  const hasBasicInfo = hasName && hasContact;

  const switchOptions: SwitchOption[] = [
    {
      id: 'mortgage',
      title: 'Mortgage Refinance',
      icon: 'home-outline',
      iconBg: Colors.light.mortgage,
      description: 'Compare rates and request a refinance switch',
      available: !!mortgage && hasBasicInfo && hasAddress,
      reason: !mortgage ? 'Set up mortgage details first' : !hasBasicInfo ? 'Complete personal details' : !hasAddress ? 'Add your address' : undefined,
    },
    {
      id: 'super',
      title: 'Super Fund Rollover',
      icon: 'trending-up-outline',
      iconBg: Colors.light.super,
      description: 'Roll your super to a better performing fund',
      available: !!superDetails && hasBasicInfo && !!personalDetails.tfn,
      reason: !superDetails ? 'Set up super details first' : !hasBasicInfo ? 'Complete personal details' : !personalDetails.tfn ? 'Add your TFN' : undefined,
    },
    {
      id: 'insurance',
      title: 'Insurance Switch',
      icon: 'shield-outline',
      iconBg: Colors.light.insurance,
      description: 'Compare premiums and switch providers',
      available: insurancePolicies.length > 0 && hasBasicInfo,
      reason: insurancePolicies.length === 0 ? 'Add an insurance policy first' : !hasBasicInfo ? 'Complete personal details' : undefined,
    },
    {
      id: 'bank',
      title: 'Bank Account Switch',
      icon: 'card-outline',
      iconBg: Colors.light.tint,
      description: 'Switch to a better bank account',
      available: hasBankDetails && hasBasicInfo,
      reason: !hasBankDetails ? 'Add your BSB & account number' : !hasBasicInfo ? 'Complete personal details' : undefined,
    },
  ];

  const generateSwitchForm = (type: SwitchType): string => {
    const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    const fullName = `${personalDetails.firstName} ${personalDetails.lastName}`;
    const fullAddress = `${personalDetails.address.street}, ${personalDetails.address.suburb} ${personalDetails.address.state} ${personalDetails.address.postcode}`;

    switch (type) {
      case 'mortgage':
        return `MORTGAGE REFINANCE REQUEST\n` +
          `Date: ${today}\n\n` +
          `APPLICANT DETAILS\n` +
          `Name: ${fullName}\n` +
          `Date of Birth: ${personalDetails.dob}\n` +
          `Email: ${personalDetails.email}\n` +
          `Phone: ${personalDetails.phone}\n` +
          `Address: ${fullAddress}\n\n` +
          `CURRENT MORTGAGE\n` +
          `Lender: ${mortgage?.lender || 'N/A'}\n` +
          `Loan Amount: $${mortgage?.loanAmount?.toLocaleString() || '0'}\n` +
          `Interest Rate: ${mortgage?.interestRate || 0}%\n` +
          `Loan Term: ${mortgage?.loanTermYears || 0} years\n` +
          `Repayment Type: ${mortgage?.repaymentType === 'principal_interest' ? 'Principal & Interest' : 'Interest Only'}\n` +
          `Property Value: $${mortgage?.propertyValue?.toLocaleString() || '0'}\n` +
          `LVR: ${mortgage?.propertyValue ? ((mortgage.loanAmount / mortgage.propertyValue) * 100).toFixed(1) : '0'}%\n\n` +
          `REQUEST\n` +
          `I wish to refinance my existing mortgage. Please provide a competitive rate quote and outline the process for switching my home loan to your institution.\n\n` +
          `Signed: ${fullName}`;

      case 'super':
        return `SUPERANNUATION ROLLOVER REQUEST\n` +
          `Date: ${today}\n\n` +
          `MEMBER DETAILS\n` +
          `Name: ${fullName}\n` +
          `Date of Birth: ${personalDetails.dob}\n` +
          `TFN: ${personalDetails.tfn}\n` +
          `Email: ${personalDetails.email}\n` +
          `Phone: ${personalDetails.phone}\n` +
          `Address: ${fullAddress}\n\n` +
          `CURRENT SUPER FUND\n` +
          `Fund: ${superDetails?.fund || 'N/A'}\n` +
          `Balance: $${superDetails?.balance?.toLocaleString() || '0'}\n` +
          `Investment Option: ${superDetails?.investmentOption || 'N/A'}\n` +
          `Employer Contribution Rate: ${superDetails?.employerRate || 0}%\n` +
          `Salary: $${superDetails?.salary?.toLocaleString() || '0'}\n\n` +
          `BANK DETAILS FOR CONTRIBUTIONS\n` +
          `Bank: ${personalDetails.bankName}\n` +
          `BSB: ${personalDetails.bsb}\n` +
          `Account: ${personalDetails.accountNumber}\n\n` +
          `REQUEST\n` +
          `I wish to roll over my existing superannuation balance to your fund. Please initiate the rollover process and provide confirmation of receipt.\n\n` +
          `Signed: ${fullName}`;

      case 'insurance':
        const policies = insurancePolicies.map(p =>
          `- ${p.type.charAt(0).toUpperCase() + p.type.slice(1).replace('_', ' ')}: ${p.provider}, Premium $${p.premium}/${p.premiumFrequency}, Cover $${p.coverAmount?.toLocaleString()}, Renewal ${p.renewalDate}`
        ).join('\n');
        return `INSURANCE SWITCH REQUEST\n` +
          `Date: ${today}\n\n` +
          `POLICYHOLDER DETAILS\n` +
          `Name: ${fullName}\n` +
          `Date of Birth: ${personalDetails.dob}\n` +
          `Email: ${personalDetails.email}\n` +
          `Phone: ${personalDetails.phone}\n` +
          `Address: ${fullAddress}\n\n` +
          `CURRENT POLICIES\n${policies}\n\n` +
          `REQUEST\n` +
          `I am seeking competitive quotes for the above insurance policies. Please provide a comparison and outline the switching process.\n\n` +
          `Signed: ${fullName}`;

      case 'bank':
        return `BANK ACCOUNT SWITCH REQUEST\n` +
          `Date: ${today}\n\n` +
          `ACCOUNT HOLDER DETAILS\n` +
          `Name: ${fullName}\n` +
          `Date of Birth: ${personalDetails.dob}\n` +
          `Email: ${personalDetails.email}\n` +
          `Phone: ${personalDetails.phone}\n` +
          `Address: ${fullAddress}\n\n` +
          `CURRENT BANK ACCOUNT\n` +
          `Bank: ${personalDetails.bankName}\n` +
          `BSB: ${personalDetails.bsb}\n` +
          `Account Number: ${personalDetails.accountNumber}\n\n` +
          `REQUEST\n` +
          `I wish to switch my primary bank account to your institution. Please open a new account and assist with transferring my direct debits and incoming payments.\n\n` +
          `Signed: ${fullName}`;

      default:
        return '';
    }
  };

  const handleGenerate = () => {
    if (!selectedType) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setGenerated(true);
  };

  const handleShare = async () => {
    if (!selectedType) return;
    const form = generateSwitchForm(selectedType);
    try {
      await Share.share({ message: form, title: `${switchOptions.find(o => o.id === selectedType)?.title} Form` });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = () => {
    if (!selectedType) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Copied', 'Switch request form copied to clipboard');
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.topBar}>
        <Pressable onPress={goBack} hitSlop={12}><Ionicons name="close" size={26} color={Colors.light.text} /></Pressable>
        <Text style={styles.topTitle}>Switch Request</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 20 }}>
        {!generated ? (
          <>
            <View style={styles.headerCard}>
              <Ionicons name="swap-horizontal" size={28} color={Colors.light.tint} />
              <Text style={styles.headerTitle}>Compare & Switch Providers</Text>
              <Text style={styles.headerSubtext}>Select a service to generate a switch request form pre-filled with your financial data.</Text>
            </View>

            {switchOptions.map(option => (
              <Pressable
                key={option.id}
                style={[styles.optionCard, selectedType === option.id && styles.optionCardSelected, !option.available && styles.optionCardDisabled]}
                onPress={() => option.available && setSelectedType(option.id)}
              >
                <View style={[styles.optionIcon, { backgroundColor: option.iconBg + '20' }]}>
                  <Ionicons name={option.icon as any} size={24} color={option.available ? option.iconBg : Colors.light.gray400} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.optionTitle, !option.available && { color: Colors.light.gray400 }]}>{option.title}</Text>
                  <Text style={styles.optionDesc}>{option.available ? option.description : option.reason}</Text>
                </View>
                {option.available ? (
                  <Ionicons name={selectedType === option.id ? "radio-button-on" : "radio-button-off"} size={22} color={selectedType === option.id ? Colors.light.tint : Colors.light.gray300} />
                ) : (
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.light.gray400} />
                )}
              </Pressable>
            ))}

            {selectedType && (
              <View style={styles.previewSection}>
                <Text style={styles.previewTitle}>Preview</Text>
                <View style={styles.previewCard}>
                  <Text style={styles.previewText}>{generateSwitchForm(selectedType)}</Text>
                </View>
                <Pressable style={styles.generateBtn} onPress={handleGenerate}>
                  <Ionicons name="document-text-outline" size={20} color="#FFF" />
                  <Text style={styles.generateBtnText}>Generate & Share</Text>
                </Pressable>
              </View>
            )}
          </>
        ) : (
          <View style={styles.generatedSection}>
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={40} color="#10B981" />
              <Text style={styles.successTitle}>Switch Request Generated</Text>
              <Text style={styles.successSubtext}>Your {switchOptions.find(o => o.id === selectedType)?.title?.toLowerCase()} form is ready to share with providers.</Text>
            </View>

            <View style={styles.previewCard}>
              <Text style={styles.previewText}>{selectedType ? generateSwitchForm(selectedType) : ''}</Text>
            </View>

            <View style={styles.actionRow}>
              <Pressable style={styles.actionBtn} onPress={handleShare}>
                <Ionicons name="share-outline" size={22} color={Colors.light.tint} />
                <Text style={styles.actionBtnText}>Share</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={handleCopy}>
                <Ionicons name="copy-outline" size={22} color={Colors.light.tint} />
                <Text style={styles.actionBtnText}>Copy</Text>
              </Pressable>
            </View>

            <Pressable style={styles.newRequestBtn} onPress={() => { setGenerated(false); setSelectedType(null); }}>
              <Text style={styles.newRequestBtnText}>Generate Another Request</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  topTitle: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.light.text },
  headerCard: { alignItems: 'center', marginHorizontal: 20, marginTop: 8, marginBottom: 20, padding: 24, backgroundColor: Colors.light.tint + '10', borderRadius: 16 },
  headerTitle: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.light.text, marginTop: 10 },
  headerSubtext: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.light.textSecondary, textAlign: 'center', marginTop: 6 },
  optionCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 10, backgroundColor: Colors.light.card, borderRadius: 14, padding: 16, borderWidth: 2, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  optionCardSelected: { borderColor: Colors.light.tint, backgroundColor: Colors.light.tint + '08' },
  optionCardDisabled: { opacity: 0.6 },
  optionIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.light.text },
  optionDesc: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.light.textSecondary, marginTop: 2 },
  previewSection: { marginHorizontal: 20, marginTop: 16 },
  previewTitle: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.light.text, marginBottom: 10 },
  previewCard: { backgroundColor: Colors.light.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.light.gray200 },
  previewText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.light.text, lineHeight: 18 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.tint, borderRadius: 12, paddingVertical: 14, marginTop: 16, gap: 8 },
  generateBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: '#FFF' },
  generatedSection: { marginHorizontal: 20 },
  successBanner: { alignItems: 'center', padding: 24, marginBottom: 16 },
  successTitle: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: Colors.light.text, marginTop: 12 },
  successSubtext: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.light.textSecondary, textAlign: 'center', marginTop: 6 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.tint + '15', borderRadius: 12, paddingVertical: 14, gap: 8 },
  actionBtnText: { fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.light.tint },
  newRequestBtn: { alignItems: 'center', marginTop: 20, paddingVertical: 14 },
  newRequestBtnText: { fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.light.tint },
});
