import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, Pressable, TextInput, ScrollView, Platform, Animated, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useFinance } from "@/contexts/FinanceContext";
import { useRewards, FactFindSection } from "@/contexts/RewardsContext";

function goBack() { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/rewards"); }

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

export default function FactFindScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { personalDetails, updatePersonalDetails, mortgage, superDetails, insurancePolicies } = useFinance();
  const { factFindSections, completeFactFind, completeFactFindSection, getFactFindProgress, state } = useRewards();

  const [firstName, setFirstName] = useState(personalDetails.firstName);
  const [lastName, setLastName] = useState(personalDetails.lastName);
  const [dob, setDob] = useState(personalDetails.dob);
  const [email, setEmail] = useState(personalDetails.email);
  const [phone, setPhone] = useState(personalDetails.phone);
  const [street, setStreet] = useState(personalDetails.address.street);
  const [suburb, setSuburb] = useState(personalDetails.address.suburb);
  const [addrState, setAddrState] = useState(personalDetails.address.state);
  const [postcode, setPostcode] = useState(personalDetails.address.postcode);
  const [bankName, setBankName] = useState(personalDetails.bankName);
  const [bsb, setBsb] = useState(personalDetails.bsb);
  const [accountNumber, setAccountNumber] = useState(personalDetails.accountNumber);
  const [tfn, setTfn] = useState(personalDetails.tfn);
  const [expandedSection, setExpandedSection] = useState<string | null>('personal_basics');
  const [coinToast, setCoinToast] = useState<{ amount: number; label: string } | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const progress = getFactFindProgress();

  const showCoinToast = (amount: number, label: string) => {
    setCoinToast({ amount, label });
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setCoinToast(null));
  };

  const saveAndReward = (fieldId: string, label: string, value: string, updateKey: string, isAddress?: boolean) => {
    if (!value.trim()) return;
    if (isAddress) {
      updatePersonalDetails({ address: { ...personalDetails.address, [updateKey]: value.trim() } });
    } else {
      updatePersonalDetails({ [updateKey]: value.trim() });
    }
    if (!state.completedFactFindIds.includes(fieldId)) {
      const earned = completeFactFind(fieldId);
      if (earned > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showCoinToast(earned, label);
      }
    }
  };

  const checkSectionBonus = (sectionId: string) => {
    const bonus = completeFactFindSection(sectionId);
    if (bonus > 0) {
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showCoinToast(bonus, 'Section Bonus!');
      }, 2000);
    }
  };

  const isFieldComplete = (fieldId: string) => state.completedFactFindIds.includes(fieldId);
  const isSectionComplete = (sectionId: string) => state.completedFactFindIds.includes(`ff_section_${sectionId}`);

  const getSectionFieldsCompleted = (section: FactFindSection) => {
    return section.fields.filter(f => isFieldComplete(f.id)).length;
  };

  const getSectionTotalCoins = (section: FactFindSection) => {
    return section.fields.reduce((sum, f) => sum + f.coins, 0) + section.bonusCoins;
  };

  const isAutoCompleted = (sectionId: string) => {
    if (sectionId === 'mortgage_details') return !!mortgage;
    if (sectionId === 'super_details') return !!superDetails;
    if (sectionId === 'insurance_details') return insurancePolicies.length >= 1;
    return false;
  };

  useEffect(() => {
    if (mortgage) {
      if (!isFieldComplete('ff_mortgage_lender') && mortgage.lender) completeFactFind('ff_mortgage_lender');
      if (!isFieldComplete('ff_mortgage_amount') && mortgage.loanAmount > 0) completeFactFind('ff_mortgage_amount');
      if (!isFieldComplete('ff_mortgage_rate') && mortgage.interestRate > 0) completeFactFind('ff_mortgage_rate');
      if (!isFieldComplete('ff_mortgage_term') && mortgage.loanTermYears > 0) completeFactFind('ff_mortgage_term');
      if (!isFieldComplete('ff_mortgage_property') && mortgage.propertyValue > 0) completeFactFind('ff_mortgage_property');
      completeFactFindSection('mortgage_details');
    }
  }, [mortgage]);

  useEffect(() => {
    if (superDetails) {
      if (!isFieldComplete('ff_super_fund') && superDetails.fund) completeFactFind('ff_super_fund');
      if (!isFieldComplete('ff_super_balance') && superDetails.balance > 0) completeFactFind('ff_super_balance');
      if (!isFieldComplete('ff_super_salary') && superDetails.salary > 0) completeFactFind('ff_super_salary');
      if (!isFieldComplete('ff_super_employer_rate') && superDetails.employerRate > 0) completeFactFind('ff_super_employer_rate');
      completeFactFindSection('super_details');
    }
  }, [superDetails]);

  useEffect(() => {
    if (insurancePolicies.length >= 1 && !isFieldComplete('ff_insurance_policy1')) completeFactFind('ff_insurance_policy1');
    if (insurancePolicies.length >= 2 && !isFieldComplete('ff_insurance_policy2')) completeFactFind('ff_insurance_policy2');
    if (insurancePolicies.length >= 3 && !isFieldComplete('ff_insurance_policy3')) {
      completeFactFind('ff_insurance_policy3');
      completeFactFindSection('insurance_details');
    }
  }, [insurancePolicies]);

  const renderField = (fieldId: string, label: string, value: string, setter: (v: string) => void, updateKey: string, opts?: { placeholder?: string; keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad'; isAddress?: boolean; maxLength?: number }) => {
    const done = isFieldComplete(fieldId);
    const field = factFindSections.flatMap(s => s.fields).find(f => f.id === fieldId);
    return (
      <View style={styles.fieldRow} key={fieldId}>
        <View style={styles.fieldHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Ionicons name={done ? "checkmark-circle" : "ellipse-outline"} size={20} color={done ? '#10B981' : Colors.light.gray400} style={{ marginRight: 8 }} />
            <Text style={[styles.fieldLabel, done && { color: Colors.light.gray400 }]}>{label}</Text>
          </View>
          <View style={[styles.coinBadge, done && { backgroundColor: '#E5E7EB' }]}>
            <Ionicons name="diamond" size={12} color={done ? Colors.light.gray400 : '#F59E0B'} />
            <Text style={[styles.coinBadgeText, done && { color: Colors.light.gray400 }]}>{field?.coins || 0}</Text>
          </View>
        </View>
        <TextInput
          style={[styles.input, done && styles.inputDone]}
          value={value}
          onChangeText={setter}
          placeholder={opts?.placeholder || `Enter ${label.toLowerCase()}`}
          placeholderTextColor={Colors.light.gray400}
          keyboardType={opts?.keyboardType || 'default'}
          maxLength={opts?.maxLength}
          onBlur={() => saveAndReward(fieldId, label, value, updateKey, opts?.isAddress)}
          editable={!done}
        />
      </View>
    );
  };

  const renderSectionContent = (section: FactFindSection) => {
    switch (section.id) {
      case 'personal_basics':
        return (
          <View>
            {renderField('ff_firstName', 'First Name', firstName, setFirstName, 'firstName')}
            {renderField('ff_lastName', 'Last Name', lastName, setLastName, 'lastName')}
            {renderField('ff_dob', 'Date of Birth', dob, setDob, 'dob', { placeholder: 'DD/MM/YYYY' })}
            {!isSectionComplete('personal_basics') && (
              <Pressable style={styles.saveBtn} onPress={() => { saveAndReward('ff_firstName', 'First Name', firstName, 'firstName'); saveAndReward('ff_lastName', 'Last Name', lastName, 'lastName'); saveAndReward('ff_dob', 'Date of Birth', dob, 'dob'); setTimeout(() => checkSectionBonus('personal_basics'), 500); }}>
                <Text style={styles.saveBtnText}>Save & Earn Coins</Text>
              </Pressable>
            )}
          </View>
        );
      case 'contact_details':
        return (
          <View>
            {renderField('ff_email', 'Email Address', email, setEmail, 'email', { placeholder: 'you@example.com', keyboardType: 'email-address' })}
            {renderField('ff_phone', 'Phone Number', phone, setPhone, 'phone', { placeholder: '04XX XXX XXX', keyboardType: 'phone-pad' })}
            {!isSectionComplete('contact_details') && (
              <Pressable style={styles.saveBtn} onPress={() => { saveAndReward('ff_email', 'Email', email, 'email'); saveAndReward('ff_phone', 'Phone', phone, 'phone'); setTimeout(() => checkSectionBonus('contact_details'), 500); }}>
                <Text style={styles.saveBtnText}>Save & Earn Coins</Text>
              </Pressable>
            )}
          </View>
        );
      case 'address':
        return (
          <View>
            {renderField('ff_street', 'Street Address', street, setStreet, 'street', { placeholder: '123 Example St', isAddress: true })}
            {renderField('ff_suburb', 'Suburb', suburb, setSuburb, 'suburb', { placeholder: 'e.g. Parramatta', isAddress: true })}
            <View style={styles.fieldRow}>
              <View style={styles.fieldHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons name={isFieldComplete('ff_state') ? "checkmark-circle" : "ellipse-outline"} size={20} color={isFieldComplete('ff_state') ? '#10B981' : Colors.light.gray400} style={{ marginRight: 8 }} />
                  <Text style={[styles.fieldLabel, isFieldComplete('ff_state') && { color: Colors.light.gray400 }]}>State</Text>
                </View>
                <View style={[styles.coinBadge, isFieldComplete('ff_state') && { backgroundColor: '#E5E7EB' }]}>
                  <Ionicons name="diamond" size={12} color={isFieldComplete('ff_state') ? Colors.light.gray400 : '#F59E0B'} />
                  <Text style={[styles.coinBadgeText, isFieldComplete('ff_state') && { color: Colors.light.gray400 }]}>20</Text>
                </View>
              </View>
              <View style={styles.stateRow}>
                {AU_STATES.map(s => (
                  <Pressable key={s} style={[styles.stateChip, addrState === s && styles.stateChipActive, isFieldComplete('ff_state') && { opacity: 0.5 }]} onPress={() => { if (isFieldComplete('ff_state')) return; setAddrState(s); saveAndReward('ff_state', 'State', s, 'state', true); }}>
                    <Text style={[styles.stateChipText, addrState === s && styles.stateChipTextActive]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {renderField('ff_postcode', 'Postcode', postcode, setPostcode, 'postcode', { placeholder: 'e.g. 2150', keyboardType: 'number-pad', isAddress: true, maxLength: 4 })}
            {!isSectionComplete('address') && (
              <Pressable style={styles.saveBtn} onPress={() => { saveAndReward('ff_street', 'Street', street, 'street', true); saveAndReward('ff_suburb', 'Suburb', suburb, 'suburb', true); if (addrState) saveAndReward('ff_state', 'State', addrState, 'state', true); saveAndReward('ff_postcode', 'Postcode', postcode, 'postcode', true); setTimeout(() => checkSectionBonus('address'), 500); }}>
                <Text style={styles.saveBtnText}>Save & Earn Coins</Text>
              </Pressable>
            )}
          </View>
        );
      case 'bank_account':
        return (
          <View>
            {renderField('ff_bankName', 'Bank Name', bankName, setBankName, 'bankName', { placeholder: 'e.g. Commonwealth Bank' })}
            {renderField('ff_bsb', 'BSB Number', bsb, setBsb, 'bsb', { placeholder: 'XXX-XXX', keyboardType: 'number-pad', maxLength: 7 })}
            {renderField('ff_accountNumber', 'Account Number', accountNumber, setAccountNumber, 'accountNumber', { placeholder: 'XXXX XXXX', keyboardType: 'number-pad' })}
            {!isSectionComplete('bank_account') && (
              <Pressable style={styles.saveBtn} onPress={() => { saveAndReward('ff_bankName', 'Bank Name', bankName, 'bankName'); saveAndReward('ff_bsb', 'BSB', bsb, 'bsb'); saveAndReward('ff_accountNumber', 'Account Number', accountNumber, 'accountNumber'); setTimeout(() => checkSectionBonus('bank_account'), 500); }}>
                <Text style={styles.saveBtnText}>Save & Earn Coins</Text>
              </Pressable>
            )}
          </View>
        );
      case 'tax_details':
        return (
          <View>
            {renderField('ff_tfn', 'Tax File Number', tfn, setTfn, 'tfn', { placeholder: 'XXX XXX XXX', keyboardType: 'number-pad', maxLength: 11 })}
            <View style={styles.infoCard}>
              <Ionicons name="lock-closed-outline" size={16} color={Colors.light.tint} />
              <Text style={styles.infoCardText}>Your TFN is stored securely on your device only and never sent to any server.</Text>
            </View>
            {!isSectionComplete('tax_details') && (
              <Pressable style={styles.saveBtn} onPress={() => { saveAndReward('ff_tfn', 'TFN', tfn, 'tfn'); setTimeout(() => checkSectionBonus('tax_details'), 500); }}>
                <Text style={styles.saveBtnText}>Save & Earn Coins</Text>
              </Pressable>
            )}
          </View>
        );
      case 'mortgage_details':
        return (
          <View>
            {mortgage ? (
              <View style={styles.autoCompleteCard}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.autoCompleteTitle}>Auto-detected from Mortgage tab</Text>
                  <Text style={styles.autoCompleteSubtext}>{mortgage.lender} - ${mortgage.loanAmount.toLocaleString()} @ {mortgage.interestRate}%</Text>
                </View>
              </View>
            ) : (
              <View style={styles.autoCompleteCard}>
                <Ionicons name="information-circle-outline" size={24} color={Colors.light.tint} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.autoCompleteTitle}>Set up your mortgage first</Text>
                  <Pressable onPress={() => router.push('/setup-mortgage')}>
                    <Text style={[styles.autoCompleteSubtext, { color: Colors.light.tint }]}>Go to Mortgage Setup</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        );
      case 'super_details':
        return (
          <View>
            {superDetails ? (
              <View style={styles.autoCompleteCard}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.autoCompleteTitle}>Auto-detected from Super tab</Text>
                  <Text style={styles.autoCompleteSubtext}>{superDetails.fund} - ${superDetails.balance.toLocaleString()}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.autoCompleteCard}>
                <Ionicons name="information-circle-outline" size={24} color={Colors.light.tint} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.autoCompleteTitle}>Set up your super first</Text>
                  <Pressable onPress={() => router.push('/setup-super')}>
                    <Text style={[styles.autoCompleteSubtext, { color: Colors.light.tint }]}>Go to Super Setup</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        );
      case 'insurance_details':
        return (
          <View>
            <View style={styles.autoCompleteCard}>
              <Ionicons name={insurancePolicies.length >= 3 ? "checkmark-circle" : "information-circle-outline"} size={24} color={insurancePolicies.length >= 3 ? '#10B981' : Colors.light.tint} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.autoCompleteTitle}>{insurancePolicies.length} {insurancePolicies.length === 1 ? 'policy' : 'policies'} added</Text>
                <Text style={styles.autoCompleteSubtext}>
                  {insurancePolicies.length >= 3 ? 'All 3 policies detected' : `Add ${3 - insurancePolicies.length} more for full bonus`}
                </Text>
                {insurancePolicies.length < 3 && (
                  <Pressable onPress={() => router.push('/add-insurance')}>
                    <Text style={{ color: Colors.light.tint, fontFamily: 'DMSans_600SemiBold', fontSize: 13, marginTop: 4 }}>Add Insurance Policy</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.topBar}>
        <Pressable onPress={goBack} hitSlop={12}><Ionicons name="close" size={26} color={Colors.light.text} /></Pressable>
        <Text style={styles.topTitle}>Financial Fact Find</Text>
        <View style={{ width: 26 }} />
      </View>

      {coinToast && (
        <Animated.View style={[styles.coinToast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
          <Ionicons name="diamond" size={18} color="#F59E0B" />
          <Text style={styles.coinToastText}>+{coinToast.amount} coins - {coinToast.label}</Text>
        </Animated.View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 20 }} keyboardShouldPersistTaps="handled">
        <View style={styles.progressHeader}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Quest Progress</Text>
            <Text style={styles.progressPercent}>{progress.percentage}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress.percentage}%` }]} />
          </View>
          <Text style={styles.progressSubtext}>{progress.completed}/{progress.total} fields completed</Text>
        </View>

        {factFindSections.map(section => {
          const fieldsComplete = getSectionFieldsCompleted(section);
          const sectionDone = isSectionComplete(section.id);
          const isExpanded = expandedSection === section.id;
          const totalCoins = getSectionTotalCoins(section);

          return (
            <View key={section.id} style={styles.sectionCard}>
              <Pressable style={styles.sectionHeader} onPress={() => setExpandedSection(isExpanded ? null : section.id)}>
                <View style={[styles.sectionIcon, { backgroundColor: section.iconBg + '20' }]}>
                  <Ionicons name={section.icon as any} size={22} color={section.iconBg} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    {sectionDone && <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginLeft: 6 }} />}
                  </View>
                  <Text style={styles.sectionSubtitle}>{section.description}</Text>
                  <View style={styles.sectionMeta}>
                    <Text style={styles.sectionMetaText}>{fieldsComplete}/{section.fields.length} fields</Text>
                    <View style={styles.sectionCoinBadge}>
                      <Ionicons name="diamond" size={11} color="#F59E0B" />
                      <Text style={styles.sectionCoinText}>{totalCoins} coins</Text>
                    </View>
                  </View>
                </View>
                <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={Colors.light.gray400} />
              </Pressable>
              {isExpanded && (
                <View style={styles.sectionContent}>
                  {sectionDone && (
                    <View style={styles.sectionCompleteBanner}>
                      <Ionicons name="trophy" size={16} color="#F59E0B" />
                      <Text style={styles.sectionCompleteText}>Section complete! +{section.bonusCoins} bonus coins earned</Text>
                    </View>
                  )}
                  {renderSectionContent(section)}
                </View>
              )}
            </View>
          );
        })}

        {progress.percentage === 100 && (
          <View style={styles.allCompleteCard}>
            <Ionicons name="trophy" size={32} color="#F59E0B" />
            <Text style={styles.allCompleteTitle}>Fact Find Complete!</Text>
            <Text style={styles.allCompleteSubtext}>You can now generate account comparisons and switch requests</Text>
            <Pressable style={styles.switchBtn} onPress={() => router.push('/switch-request' as any)}>
              <Ionicons name="swap-horizontal" size={20} color="#FFF" />
              <Text style={styles.switchBtnText}>Generate Switch Request</Text>
            </Pressable>
          </View>
        )}

        {progress.percentage >= 50 && progress.percentage < 100 && (
          <View style={[styles.allCompleteCard, { backgroundColor: Colors.light.tint + '10' }]}>
            <Ionicons name="swap-horizontal" size={24} color={Colors.light.tint} />
            <Text style={[styles.allCompleteTitle, { color: Colors.light.tint }]}>Switch Requests Available</Text>
            <Text style={styles.allCompleteSubtext}>You have enough data to start comparing and switching providers</Text>
            <Pressable style={styles.switchBtn} onPress={() => router.push('/switch-request' as any)}>
              <Ionicons name="swap-horizontal" size={20} color="#FFF" />
              <Text style={styles.switchBtnText}>Generate Switch Request</Text>
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
  coinToast: { position: 'absolute', top: 120, alignSelf: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  coinToastText: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: '#92400E', marginLeft: 8 },
  progressHeader: { marginHorizontal: 20, marginTop: 8, marginBottom: 16, backgroundColor: Colors.light.navy, borderRadius: 16, padding: 20 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressLabel: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: '#FFF' },
  progressPercent: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: Colors.light.tintLight },
  progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4 },
  progressBarFill: { height: 8, backgroundColor: Colors.light.tintLight, borderRadius: 4 },
  progressSubtext: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 8 },
  sectionCard: { marginHorizontal: 20, marginBottom: 12, backgroundColor: Colors.light.card, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  sectionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.light.text },
  sectionSubtitle: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.light.textSecondary, marginTop: 2 },
  sectionMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 10 },
  sectionMetaText: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: Colors.light.gray500 },
  sectionCoinBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sectionCoinText: { fontFamily: 'DMSans_600SemiBold', fontSize: 11, color: '#B45309' },
  sectionContent: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: Colors.light.gray100 },
  sectionCompleteBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, marginTop: 12, gap: 8 },
  sectionCompleteText: { fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: '#92400E' },
  fieldRow: { marginTop: 14 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  fieldLabel: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: Colors.light.text },
  coinBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 4 },
  coinBadgeText: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: '#B45309' },
  input: { backgroundColor: Colors.light.gray50, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'DMSans_400Regular', fontSize: 15, color: Colors.light.text, borderWidth: 1, borderColor: Colors.light.gray200 },
  inputDone: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', color: '#166534' },
  stateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stateChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.light.gray100, borderWidth: 1, borderColor: Colors.light.gray200 },
  stateChipActive: { backgroundColor: Colors.light.tint + '15', borderColor: Colors.light.tint },
  stateChipText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.light.textSecondary },
  stateChipTextActive: { color: Colors.light.tint },
  saveBtn: { backgroundColor: Colors.light.tint, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: '#FFF' },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.tint + '10', borderRadius: 10, padding: 12, marginTop: 10, gap: 8 },
  infoCardText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.light.tint, flex: 1 },
  autoCompleteCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.gray50, borderRadius: 12, padding: 14, marginTop: 12 },
  autoCompleteTitle: { fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.light.text },
  autoCompleteSubtext: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.light.textSecondary, marginTop: 2 },
  allCompleteCard: { marginHorizontal: 20, marginTop: 8, marginBottom: 20, backgroundColor: '#FEF3C7', borderRadius: 16, padding: 24, alignItems: 'center' },
  allCompleteTitle: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: '#92400E', marginTop: 8 },
  allCompleteSubtext: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#92400E', textAlign: 'center', marginTop: 4 },
  switchBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.tint, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 16, gap: 8 },
  switchBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: '#FFF' },
});
