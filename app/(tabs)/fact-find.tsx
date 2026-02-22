import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Platform, Animated, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useFinance } from '@/contexts/FinanceContext';
import { useRewards, FactFindSection } from '@/contexts/RewardsContext';
import CoinHeader from '@/components/CoinHeader';

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

type SubTab = 'personal' | 'financial' | 'planning';

const SUB_TAB_SECTIONS: Record<SubTab, string[]> = {
  personal: ['personal_basics', 'contact_details', 'address', 'dependents', 'employment'],
  financial: ['other_income', 'bank_account', 'tax_details', 'assets', 'liabilities', 'mortgage_details', 'super_details', 'insurance_details'],
  planning: ['risk_profile', 'retirement', 'estate_planning', 'health', 'centrelink'],
};

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not', label: 'Prefer not to say' },
];

const MARITAL_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'de_facto', label: 'De Facto' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'separated', label: 'Separated' },
  { value: 'widowed', label: 'Widowed' },
];

const RESIDENCY_OPTIONS = [
  { value: 'citizen', label: 'AU Citizen' },
  { value: 'permanent_resident', label: 'Permanent Resident' },
  { value: 'temporary_visa', label: 'Temporary Visa' },
  { value: 'nz_citizen', label: 'NZ Citizen' },
];

const CONTACT_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'sms', label: 'SMS' },
];

const EMPLOYMENT_OPTIONS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'casual', label: 'Casual' },
  { value: 'self_employed', label: 'Self Employed' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'not_employed', label: 'Not Employed' },
  { value: 'retired', label: 'Retired' },
];

const RELATIONSHIP_OPTIONS = [
  { value: 'child', label: 'Child' },
  { value: 'stepchild', label: 'Stepchild' },
  { value: 'parent', label: 'Parent' },
  { value: 'other', label: 'Other' },
];

const YES_NO_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const YES_NO_UNSURE_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unsure', label: 'Unsure' },
];

const TIMEFRAME_OPTIONS = [
  { value: 'short', label: 'Short (1-3 yrs)' },
  { value: 'medium', label: 'Medium (3-7 yrs)' },
  { value: 'long', label: 'Long (7+ yrs)' },
];

const RISK_OPTIONS = [
  { value: 'conservative', label: 'Conservative' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'growth', label: 'Growth' },
  { value: 'high_growth', label: 'High Growth' },
];

const EXPERIENCE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'limited', label: 'Limited' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'extensive', label: 'Extensive' },
];

const REACTION_OPTIONS = [
  { value: 'sell_immediately', label: 'Sell Immediately' },
  { value: 'wait_and_see', label: 'Wait & See' },
  { value: 'buy_more', label: 'Buy More' },
];

const INCOME_GROWTH_OPTIONS = [
  { value: 'income', label: 'Income' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'growth', label: 'Growth' },
];

export default function FactFindTabScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const { personalDetails, updatePersonalDetails, mortgage, superDetails, insurancePolicies } = useFinance();
  const { factFindSections, completeFactFind, completeFactFindSection, getFactFindProgress, state } = useRewards();

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('personal');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [coinToast, setCoinToast] = useState<{ amount: number; label: string } | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const [firstName, setFirstName] = useState(personalDetails.firstName);
  const [lastName, setLastName] = useState(personalDetails.lastName);
  const [dob, setDob] = useState(personalDetails.dob);
  const [gender, setGender] = useState(personalDetails.gender);
  const [maritalStatus, setMaritalStatus] = useState(personalDetails.maritalStatus);
  const [residencyStatus, setResidencyStatus] = useState(personalDetails.residencyStatus);

  const [email, setEmail] = useState(personalDetails.email);
  const [phone, setPhone] = useState(personalDetails.phone);
  const [preferredContact, setPreferredContact] = useState(personalDetails.preferredContact);

  const [street, setStreet] = useState(personalDetails.address.street);
  const [suburb, setSuburb] = useState(personalDetails.address.suburb);
  const [addrState, setAddrState] = useState(personalDetails.address.state);
  const [postcode, setPostcode] = useState(personalDetails.address.postcode);

  const [dep1Name, setDep1Name] = useState(personalDetails.dependents[0]?.name || '');
  const [dep1Dob, setDep1Dob] = useState(personalDetails.dependents[0]?.dob || '');
  const [dep1Rel, setDep1Rel] = useState(personalDetails.dependents[0]?.relationship || '');
  const [dep2Name, setDep2Name] = useState(personalDetails.dependents[1]?.name || '');
  const [dep2Dob, setDep2Dob] = useState(personalDetails.dependents[1]?.dob || '');
  const [dep3Name, setDep3Name] = useState(personalDetails.dependents[2]?.name || '');

  const [empStatus, setEmpStatus] = useState(personalDetails.employment.status);
  const [employer, setEmployer] = useState(personalDetails.employment.employer);
  const [occupation, setOccupation] = useState(personalDetails.employment.occupation);
  const [industry, setIndustry] = useState(personalDetails.employment.industry);
  const [yearsInRole, setYearsInRole] = useState(personalDetails.employment.yearsInRole);
  const [baseSalary, setBaseSalary] = useState(personalDetails.employment.baseSalary);
  const [bonus, setBonus] = useState(personalDetails.employment.bonus);
  const [overtime, setOvertime] = useState(personalDetails.employment.overtime);

  const [rentalIncome, setRentalIncome] = useState(personalDetails.income.rentalIncome);
  const [investmentIncome, setInvestmentIncome] = useState(personalDetails.income.investmentIncome);
  const [dividendIncome, setDividendIncome] = useState(personalDetails.income.dividendIncome);
  const [govBenefits, setGovBenefits] = useState(personalDetails.income.governmentBenefits);
  const [otherIncome, setOtherIncome] = useState(personalDetails.income.otherIncome);

  const [bankName, setBankName] = useState(personalDetails.bankName);
  const [bsb, setBsb] = useState(personalDetails.bsb);
  const [accountNumber, setAccountNumber] = useState(personalDetails.accountNumber);
  const [tfn, setTfn] = useState(personalDetails.tfn);

  const [homeValue, setHomeValue] = useState(personalDetails.assets.homeValue);
  const [investmentProperty, setInvestmentProperty] = useState(personalDetails.assets.investmentPropertyValue);
  const [shares, setShares] = useState(personalDetails.assets.sharePortfolioValue);
  const [managedFunds, setManagedFunds] = useState(personalDetails.assets.managedFundsValue);
  const [termDeposits, setTermDeposits] = useState(personalDetails.assets.termDepositsValue);
  const [crypto, setCrypto] = useState(personalDetails.assets.cryptoValue);
  const [vehicles, setVehicles] = useState(personalDetails.assets.vehicleValue);
  const [otherAssets, setOtherAssets] = useState(personalDetails.assets.otherAssetsValue);

  const [personalLoan, setPersonalLoan] = useState(personalDetails.liabilities.personalLoanBalance);
  const [creditCard, setCreditCard] = useState(personalDetails.liabilities.creditCardBalance);
  const [carLoan, setCarLoan] = useState(personalDetails.liabilities.carLoanBalance);
  const [hecsDebt, setHecsDebt] = useState(personalDetails.liabilities.hecsDebt);
  const [afterpay, setAfterpay] = useState(personalDetails.liabilities.afterpayBalance);
  const [otherDebt, setOtherDebt] = useState(personalDetails.liabilities.otherDebtBalance);

  const [investTimeframe, setInvestTimeframe] = useState(personalDetails.riskProfile.investmentTimeframe);
  const [riskTolerance, setRiskTolerance] = useState(personalDetails.riskProfile.riskTolerance);
  const [investExperience, setInvestExperience] = useState(personalDetails.riskProfile.investmentExperience);
  const [reactionToLoss, setReactionToLoss] = useState(personalDetails.riskProfile.reactionToLoss);
  const [incomeVsGrowth, setIncomeVsGrowth] = useState(personalDetails.riskProfile.incomeVsGrowth);

  const [retirementAge, setRetirementAge] = useState(personalDetails.retirement.desiredRetirementAge);
  const [retirementIncome, setRetirementIncome] = useState(personalDetails.retirement.desiredRetirementIncome);
  const [agedPension, setAgedPension] = useState(personalDetails.retirement.agedPensionEligible);
  const [downsize, setDownsize] = useState(personalDetails.retirement.downsizeIntention);

  const [hasWill, setHasWill] = useState(personalDetails.estatePlanning.hasWill);
  const [hasPOA, setHasPOA] = useState(personalDetails.estatePlanning.hasPowerOfAttorney);
  const [hasGuardian, setHasGuardian] = useState(personalDetails.estatePlanning.hasEnduringGuardian);
  const [hasBDBN, setHasBDBN] = useState(personalDetails.estatePlanning.hasBDBN);
  const [hasTrust, setHasTrust] = useState(personalDetails.estatePlanning.hasTestamentaryTrust);

  const [smoker, setSmoker] = useState(personalDetails.health.smoker);
  const [preExisting, setPreExisting] = useState(personalDetails.health.preExistingConditions);
  const [privateHealth, setPrivateHealth] = useState(personalDetails.health.privateHealthInsurance);
  const [healthFund, setHealthFund] = useState(personalDetails.health.healthFund);
  const [medicareSurcharge, setMedicareSurcharge] = useState(personalDetails.health.medicareLevySurcharge);

  const [receivingBenefits, setReceivingBenefits] = useState(personalDetails.centrelink.receivingBenefits);
  const [benefitType, setBenefitType] = useState(personalDetails.centrelink.benefitType);
  const [healthCareCard, setHealthCareCard] = useState(personalDetails.centrelink.healthCareCard);
  const [dvaBenefits, setDvaBenefits] = useState(personalDetails.centrelink.dvaBenefits);

  const progress = getFactFindProgress();
  const isFieldComplete = (fieldId: string) => state.completedFactFindIds.includes(fieldId);
  const isSectionComplete = (sectionId: string) => state.completedFactFindIds.includes(`ff_section_${sectionId}`);

  const showCoinToast = useCallback((amount: number, label: string) => {
    setCoinToast({ amount, label });
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setCoinToast(null));
  }, [toastAnim]);

  const saveField = useCallback((fieldId: string, label: string, value: string, updater: Record<string, any>) => {
    if (!value.trim()) return;
    updatePersonalDetails(updater);
    if (!state.completedFactFindIds.includes(fieldId)) {
      const earned = completeFactFind(fieldId);
      if (earned > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showCoinToast(earned, label);
      }
    }
  }, [state.completedFactFindIds, completeFactFind, updatePersonalDetails, showCoinToast]);

  const saveChipField = useCallback((fieldId: string, label: string, value: string, updater: Record<string, any>) => {
    updatePersonalDetails(updater);
    if (!state.completedFactFindIds.includes(fieldId)) {
      const earned = completeFactFind(fieldId);
      if (earned > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showCoinToast(earned, label);
      }
    }
  }, [state.completedFactFindIds, completeFactFind, updatePersonalDetails, showCoinToast]);

  const checkSectionBonus = useCallback((sectionId: string) => {
    const bonus = completeFactFindSection(sectionId);
    if (bonus > 0) {
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showCoinToast(bonus, 'Section Bonus!');
      }, 2000);
    }
  }, [completeFactFindSection, showCoinToast]);

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

  const getSectionFieldsCompleted = (section: FactFindSection) => section.fields.filter(f => isFieldComplete(f.id)).length;
  const getSectionTotalCoins = (section: FactFindSection) => section.fields.reduce((sum, f) => sum + f.coins, 0) + section.bonusCoins;

  const filteredSections = factFindSections.filter(s => SUB_TAB_SECTIONS[activeSubTab].includes(s.id));

  const renderTextInput = (fieldId: string, label: string, value: string, setter: (v: string) => void, updater: Record<string, any>, opts?: { placeholder?: string; keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad'; maxLength?: number; isCurrency?: boolean }) => {
    const done = isFieldComplete(fieldId);
    const field = factFindSections.flatMap(s => s.fields).find(f => f.id === fieldId);
    return (
      <View style={styles.fieldRow} key={fieldId}>
        <View style={styles.fieldHeader}>
          <View style={styles.fieldLabelRow}>
            <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={done ? '#10B981' : Colors.light.gray400} style={{ marginRight: 8 }} />
            <Text style={[styles.fieldLabel, done && { color: Colors.light.gray400 }]}>{label}</Text>
          </View>
          <View style={[styles.coinBadge, done && { backgroundColor: '#E5E7EB' }]}>
            <View style={[styles.goldCoin, done && styles.goldCoinDone]}><Text style={[styles.goldCoinText, done && styles.goldCoinTextDone]}>$</Text></View>
            <Text style={[styles.coinBadgeText, done && { color: Colors.light.gray400 }]}>{field?.coins || 0}</Text>
          </View>
        </View>
        <View style={styles.inputWrap}>
          {opts?.isCurrency && <Text style={styles.currencyPrefix}>$</Text>}
          <TextInput
            style={[styles.input, done && styles.inputDone, opts?.isCurrency && { paddingLeft: 28 }]}
            value={value}
            onChangeText={setter}
            placeholder={opts?.placeholder || `Enter ${label.toLowerCase()}`}
            placeholderTextColor={Colors.light.gray400}
            keyboardType={opts?.keyboardType || (opts?.isCurrency ? 'number-pad' : 'default')}
            maxLength={opts?.maxLength}
            onBlur={() => saveField(fieldId, label, value, updater)}
            editable={!done}
          />
        </View>
      </View>
    );
  };

  const renderChipSelector = (fieldId: string, label: string, value: string, setter: (v: string) => void, options: { value: string; label: string }[], updater: (val: string) => Record<string, any>) => {
    const done = isFieldComplete(fieldId);
    const field = factFindSections.flatMap(s => s.fields).find(f => f.id === fieldId);
    return (
      <View style={styles.fieldRow} key={fieldId}>
        <View style={styles.fieldHeader}>
          <View style={styles.fieldLabelRow}>
            <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={done ? '#10B981' : Colors.light.gray400} style={{ marginRight: 8 }} />
            <Text style={[styles.fieldLabel, done && { color: Colors.light.gray400 }]}>{label}</Text>
          </View>
          <View style={[styles.coinBadge, done && { backgroundColor: '#E5E7EB' }]}>
            <View style={[styles.goldCoin, done && styles.goldCoinDone]}><Text style={[styles.goldCoinText, done && styles.goldCoinTextDone]}>$</Text></View>
            <Text style={[styles.coinBadgeText, done && { color: Colors.light.gray400 }]}>{field?.coins || 0}</Text>
          </View>
        </View>
        <View style={styles.chipRow}>
          {options.map(opt => (
            <Pressable
              key={opt.value}
              style={[styles.chip, value === opt.value && styles.chipActive, done && { opacity: 0.5 }]}
              onPress={() => {
                if (done) return;
                setter(opt.value);
                Haptics.selectionAsync();
                saveChipField(fieldId, label, opt.value, updater(opt.value));
              }}
            >
              <Text style={[styles.chipText, value === opt.value && styles.chipTextActive]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  const renderSectionContent = (section: FactFindSection) => {
    switch (section.id) {
      case 'personal_basics':
        return (
          <View>
            {renderTextInput('ff_firstName', 'First Name', firstName, setFirstName, { firstName: firstName.trim() })}
            {renderTextInput('ff_lastName', 'Last Name', lastName, setLastName, { lastName: lastName.trim() })}
            {renderTextInput('ff_dob', 'Date of Birth', dob, setDob, { dob: dob.trim() }, { placeholder: 'DD/MM/YYYY' })}
            {renderChipSelector('ff_gender', 'Gender', gender, setGender, GENDER_OPTIONS, (v) => ({ gender: v }))}
            {renderChipSelector('ff_maritalStatus', 'Marital Status', maritalStatus, setMaritalStatus, MARITAL_OPTIONS, (v) => ({ maritalStatus: v }))}
            {renderChipSelector('ff_residencyStatus', 'Residency Status', residencyStatus, setResidencyStatus, RESIDENCY_OPTIONS, (v) => ({ residencyStatus: v }))}
          </View>
        );
      case 'contact_details':
        return (
          <View>
            {renderTextInput('ff_email', 'Email Address', email, setEmail, { email: email.trim() }, { placeholder: 'you@example.com', keyboardType: 'email-address' })}
            {renderTextInput('ff_phone', 'Phone Number', phone, setPhone, { phone: phone.trim() }, { placeholder: '04XX XXX XXX', keyboardType: 'phone-pad' })}
            {renderChipSelector('ff_preferredContact', 'Preferred Contact', preferredContact, setPreferredContact, CONTACT_OPTIONS, (v) => ({ preferredContact: v }))}
          </View>
        );
      case 'address':
        return (
          <View>
            {renderTextInput('ff_street', 'Street Address', street, setStreet, { address: { street: street.trim() } }, { placeholder: '123 Example St' })}
            {renderTextInput('ff_suburb', 'Suburb', suburb, setSuburb, { address: { suburb: suburb.trim() } }, { placeholder: 'e.g. Parramatta' })}
            {renderChipSelector('ff_state', 'State', addrState, setAddrState, AU_STATES.map(s => ({ value: s, label: s })), (v) => ({ address: { state: v } }))}
            {renderTextInput('ff_postcode', 'Postcode', postcode, setPostcode, { address: { postcode: postcode.trim() } }, { placeholder: 'e.g. 2150', keyboardType: 'number-pad', maxLength: 4 })}
          </View>
        );
      case 'dependents':
        return (
          <View>
            <Text style={styles.fieldSectionLabel}>Dependent 1</Text>
            <View style={styles.fieldRow}>
              <View style={styles.fieldHeader}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name={isFieldComplete('ff_dependent1') ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={isFieldComplete('ff_dependent1') ? '#10B981' : Colors.light.gray400} style={{ marginRight: 8 }} />
                  <Text style={[styles.fieldLabel, isFieldComplete('ff_dependent1') && { color: Colors.light.gray400 }]}>First Dependent</Text>
                </View>
                <View style={[styles.coinBadge, isFieldComplete('ff_dependent1') && { backgroundColor: '#E5E7EB' }]}>
                  <View style={[styles.goldCoin, isFieldComplete('ff_dependent1') && styles.goldCoinDone]}><Text style={[styles.goldCoinText, isFieldComplete('ff_dependent1') && styles.goldCoinTextDone]}>$</Text></View>
                  <Text style={[styles.coinBadgeText, isFieldComplete('ff_dependent1') && { color: Colors.light.gray400 }]}>40</Text>
                </View>
              </View>
              <TextInput style={[styles.input, isFieldComplete('ff_dependent1') && styles.inputDone]} value={dep1Name} onChangeText={setDep1Name} placeholder="Name" placeholderTextColor={Colors.light.gray400} editable={!isFieldComplete('ff_dependent1')} onBlur={() => {
                if (!dep1Name.trim()) return;
                const deps = [...personalDetails.dependents];
                if (deps.length === 0) deps.push({ name: dep1Name.trim(), dob: dep1Dob, relationship: (dep1Rel as any) || 'child', financiallyDependent: true });
                else deps[0] = { ...deps[0], name: dep1Name.trim() };
                updatePersonalDetails({ dependents: deps });
                if (!isFieldComplete('ff_dependent1')) {
                  const earned = completeFactFind('ff_dependent1');
                  if (earned > 0) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); showCoinToast(earned, 'First Dependent'); }
                }
              }} />
              <TextInput style={[styles.input, { marginTop: 8 }, isFieldComplete('ff_dependent1') && styles.inputDone]} value={dep1Dob} onChangeText={setDep1Dob} placeholder="DOB (DD/MM/YYYY)" placeholderTextColor={Colors.light.gray400} editable={!isFieldComplete('ff_dependent1')} />
              <View style={[styles.chipRow, { marginTop: 8 }]}>
                {RELATIONSHIP_OPTIONS.map(opt => (
                  <Pressable key={opt.value} style={[styles.chip, dep1Rel === opt.value && styles.chipActive, isFieldComplete('ff_dependent1') && { opacity: 0.5 }]} onPress={() => { if (isFieldComplete('ff_dependent1')) return; setDep1Rel(opt.value); Haptics.selectionAsync(); }}>
                    <Text style={[styles.chipText, dep1Rel === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Text style={styles.fieldSectionLabel}>Dependent 2</Text>
            <View style={styles.fieldRow}>
              <View style={styles.fieldHeader}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name={isFieldComplete('ff_dependent2') ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={isFieldComplete('ff_dependent2') ? '#10B981' : Colors.light.gray400} style={{ marginRight: 8 }} />
                  <Text style={[styles.fieldLabel, isFieldComplete('ff_dependent2') && { color: Colors.light.gray400 }]}>Second Dependent</Text>
                </View>
                <View style={[styles.coinBadge, isFieldComplete('ff_dependent2') && { backgroundColor: '#E5E7EB' }]}>
                  <View style={[styles.goldCoin, isFieldComplete('ff_dependent2') && styles.goldCoinDone]}><Text style={[styles.goldCoinText, isFieldComplete('ff_dependent2') && styles.goldCoinTextDone]}>$</Text></View>
                  <Text style={[styles.coinBadgeText, isFieldComplete('ff_dependent2') && { color: Colors.light.gray400 }]}>40</Text>
                </View>
              </View>
              <TextInput style={[styles.input, isFieldComplete('ff_dependent2') && styles.inputDone]} value={dep2Name} onChangeText={setDep2Name} placeholder="Name" placeholderTextColor={Colors.light.gray400} editable={!isFieldComplete('ff_dependent2')} onBlur={() => {
                if (!dep2Name.trim()) return;
                const deps = [...personalDetails.dependents];
                while (deps.length < 2) deps.push({ name: '', dob: '', relationship: 'child', financiallyDependent: true });
                deps[1] = { ...deps[1], name: dep2Name.trim() };
                updatePersonalDetails({ dependents: deps });
                if (!isFieldComplete('ff_dependent2')) {
                  const earned = completeFactFind('ff_dependent2');
                  if (earned > 0) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); showCoinToast(earned, 'Second Dependent'); }
                }
              }} />
              <TextInput style={[styles.input, { marginTop: 8 }, isFieldComplete('ff_dependent2') && styles.inputDone]} value={dep2Dob} onChangeText={setDep2Dob} placeholder="DOB (DD/MM/YYYY)" placeholderTextColor={Colors.light.gray400} editable={!isFieldComplete('ff_dependent2')} />
            </View>
            <Text style={styles.fieldSectionLabel}>Dependent 3</Text>
            <View style={styles.fieldRow}>
              <View style={styles.fieldHeader}>
                <View style={styles.fieldLabelRow}>
                  <Ionicons name={isFieldComplete('ff_dependent3') ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={isFieldComplete('ff_dependent3') ? '#10B981' : Colors.light.gray400} style={{ marginRight: 8 }} />
                  <Text style={[styles.fieldLabel, isFieldComplete('ff_dependent3') && { color: Colors.light.gray400 }]}>Third Dependent</Text>
                </View>
                <View style={[styles.coinBadge, isFieldComplete('ff_dependent3') && { backgroundColor: '#E5E7EB' }]}>
                  <View style={[styles.goldCoin, isFieldComplete('ff_dependent3') && styles.goldCoinDone]}><Text style={[styles.goldCoinText, isFieldComplete('ff_dependent3') && styles.goldCoinTextDone]}>$</Text></View>
                  <Text style={[styles.coinBadgeText, isFieldComplete('ff_dependent3') && { color: Colors.light.gray400 }]}>40</Text>
                </View>
              </View>
              <TextInput style={[styles.input, isFieldComplete('ff_dependent3') && styles.inputDone]} value={dep3Name} onChangeText={setDep3Name} placeholder="Name" placeholderTextColor={Colors.light.gray400} editable={!isFieldComplete('ff_dependent3')} onBlur={() => {
                if (!dep3Name.trim()) return;
                const deps = [...personalDetails.dependents];
                while (deps.length < 3) deps.push({ name: '', dob: '', relationship: 'child', financiallyDependent: true });
                deps[2] = { ...deps[2], name: dep3Name.trim() };
                updatePersonalDetails({ dependents: deps });
                if (!isFieldComplete('ff_dependent3')) {
                  const earned = completeFactFind('ff_dependent3');
                  if (earned > 0) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); showCoinToast(earned, 'Third Dependent'); }
                }
              }} />
            </View>
          </View>
        );
      case 'employment':
        return (
          <View>
            {renderChipSelector('ff_empStatus', 'Employment Status', empStatus, setEmpStatus, EMPLOYMENT_OPTIONS, (v) => ({ employment: { status: v } }))}
            {renderTextInput('ff_employer', 'Employer Name', employer, setEmployer, { employment: { employer: employer.trim() } })}
            {renderTextInput('ff_occupation', 'Occupation', occupation, setOccupation, { employment: { occupation: occupation.trim() } })}
            {renderTextInput('ff_industry', 'Industry', industry, setIndustry, { employment: { industry: industry.trim() } })}
            {renderTextInput('ff_yearsInRole', 'Years in Role', yearsInRole, setYearsInRole, { employment: { yearsInRole: yearsInRole.trim() } }, { keyboardType: 'number-pad' })}
            {renderTextInput('ff_baseSalary', 'Base Salary', baseSalary, setBaseSalary, { employment: { baseSalary: baseSalary.trim() } }, { isCurrency: true, placeholder: 'e.g. 85000' })}
            {renderTextInput('ff_bonus', 'Bonus / Commission', bonus, setBonus, { employment: { bonus: bonus.trim() } }, { isCurrency: true, placeholder: 'e.g. 10000' })}
            {renderTextInput('ff_overtime', 'Overtime', overtime, setOvertime, { employment: { overtime: overtime.trim() } }, { isCurrency: true, placeholder: 'e.g. 5000' })}
          </View>
        );
      case 'other_income':
        return (
          <View>
            {renderTextInput('ff_rentalIncome', 'Rental Income', rentalIncome, setRentalIncome, { income: { rentalIncome: rentalIncome.trim() } }, { isCurrency: true, placeholder: 'Annual amount' })}
            {renderTextInput('ff_investmentIncome', 'Investment Income', investmentIncome, setInvestmentIncome, { income: { investmentIncome: investmentIncome.trim() } }, { isCurrency: true, placeholder: 'Annual amount' })}
            {renderTextInput('ff_dividendIncome', 'Dividend Income', dividendIncome, setDividendIncome, { income: { dividendIncome: dividendIncome.trim() } }, { isCurrency: true, placeholder: 'Annual amount' })}
            {renderTextInput('ff_govBenefits', 'Government Benefits', govBenefits, setGovBenefits, { income: { governmentBenefits: govBenefits.trim() } }, { isCurrency: true, placeholder: 'Annual amount' })}
            {renderTextInput('ff_otherIncome', 'Other Income', otherIncome, setOtherIncome, { income: { otherIncome: otherIncome.trim() } }, { isCurrency: true, placeholder: 'Annual amount' })}
          </View>
        );
      case 'bank_account':
        return (
          <View>
            {renderTextInput('ff_bankName', 'Bank Name', bankName, setBankName, { bankName: bankName.trim() }, { placeholder: 'e.g. Commonwealth Bank' })}
            {renderTextInput('ff_bsb', 'BSB Number', bsb, setBsb, { bsb: bsb.trim() }, { placeholder: 'XXX-XXX', keyboardType: 'number-pad', maxLength: 7 })}
            {renderTextInput('ff_accountNumber', 'Account Number', accountNumber, setAccountNumber, { accountNumber: accountNumber.trim() }, { placeholder: 'XXXX XXXX', keyboardType: 'number-pad' })}
          </View>
        );
      case 'tax_details':
        return (
          <View>
            {renderTextInput('ff_tfn', 'Tax File Number', tfn, setTfn, { tfn: tfn.trim() }, { placeholder: 'XXX XXX XXX', keyboardType: 'number-pad', maxLength: 11 })}
            <View style={styles.infoCard}>
              <Ionicons name="lock-closed-outline" size={16} color={Colors.light.tint} />
              <Text style={styles.infoCardText}>Your TFN is stored securely on your device only and never sent to any server.</Text>
            </View>
          </View>
        );
      case 'assets':
        return (
          <View>
            {renderTextInput('ff_homeValue', 'Home Value', homeValue, setHomeValue, { assets: { homeValue: homeValue.trim() } }, { isCurrency: true, placeholder: 'Estimated value' })}
            {renderTextInput('ff_investmentProperty', 'Investment Property', investmentProperty, setInvestmentProperty, { assets: { investmentPropertyValue: investmentProperty.trim() } }, { isCurrency: true, placeholder: 'Property value' })}
            {renderTextInput('ff_shares', 'Share Portfolio', shares, setShares, { assets: { sharePortfolioValue: shares.trim() } }, { isCurrency: true, placeholder: 'Total value' })}
            {renderTextInput('ff_managedFunds', 'Managed Funds', managedFunds, setManagedFunds, { assets: { managedFundsValue: managedFunds.trim() } }, { isCurrency: true, placeholder: 'Total value' })}
            {renderTextInput('ff_termDeposits', 'Term Deposits', termDeposits, setTermDeposits, { assets: { termDepositsValue: termDeposits.trim() } }, { isCurrency: true, placeholder: 'Total value' })}
            {renderTextInput('ff_crypto', 'Crypto Assets', crypto, setCrypto, { assets: { cryptoValue: crypto.trim() } }, { isCurrency: true, placeholder: 'Total value' })}
            {renderTextInput('ff_vehicles', 'Vehicles', vehicles, setVehicles, { assets: { vehicleValue: vehicles.trim() } }, { isCurrency: true, placeholder: 'Total value' })}
            {renderTextInput('ff_otherAssets', 'Other Assets', otherAssets, setOtherAssets, { assets: { otherAssetsValue: otherAssets.trim() } }, { isCurrency: true, placeholder: 'Total value' })}
          </View>
        );
      case 'liabilities':
        return (
          <View>
            {renderTextInput('ff_personalLoan', 'Personal Loan', personalLoan, setPersonalLoan, { liabilities: { personalLoanBalance: personalLoan.trim() } }, { isCurrency: true, placeholder: 'Balance owing' })}
            {renderTextInput('ff_creditCard', 'Credit Cards', creditCard, setCreditCard, { liabilities: { creditCardBalance: creditCard.trim() } }, { isCurrency: true, placeholder: 'Total balance' })}
            {renderTextInput('ff_carLoan', 'Car Loan', carLoan, setCarLoan, { liabilities: { carLoanBalance: carLoan.trim() } }, { isCurrency: true, placeholder: 'Balance owing' })}
            {renderTextInput('ff_hecsDebt', 'HECS-HELP Debt', hecsDebt, setHecsDebt, { liabilities: { hecsDebt: hecsDebt.trim() } }, { isCurrency: true, placeholder: 'Balance owing' })}
            {renderTextInput('ff_afterpay', 'Afterpay / BNPL', afterpay, setAfterpay, { liabilities: { afterpayBalance: afterpay.trim() } }, { isCurrency: true, placeholder: 'Balance owing' })}
            {renderTextInput('ff_otherDebt', 'Other Debts', otherDebt, setOtherDebt, { liabilities: { otherDebtBalance: otherDebt.trim() } }, { isCurrency: true, placeholder: 'Balance owing' })}
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
              <Ionicons name={insurancePolicies.length >= 3 ? 'checkmark-circle' : 'information-circle-outline'} size={24} color={insurancePolicies.length >= 3 ? '#10B981' : Colors.light.tint} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.autoCompleteTitle}>{insurancePolicies.length} {insurancePolicies.length === 1 ? 'policy' : 'policies'} added</Text>
                <Text style={styles.autoCompleteSubtext}>
                  {insurancePolicies.length >= 3 ? 'All 3 policies detected' : `Add ${3 - insurancePolicies.length} more for full bonus`}
                </Text>
                {insurancePolicies.length < 3 && (
                  <Pressable onPress={() => router.push('/add-insurance')}>
                    <Text style={{ color: Colors.light.tint, fontFamily: 'DMSans_600SemiBold' as const, fontSize: 13, marginTop: 4 }}>Add Insurance Policy</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        );
      case 'risk_profile':
        return (
          <View>
            {renderChipSelector('ff_investTimeframe', 'Investment Timeframe', investTimeframe, setInvestTimeframe, TIMEFRAME_OPTIONS, (v) => ({ riskProfile: { investmentTimeframe: v } }))}
            {renderChipSelector('ff_riskTolerance', 'Risk Tolerance', riskTolerance, setRiskTolerance, RISK_OPTIONS, (v) => ({ riskProfile: { riskTolerance: v } }))}
            {renderChipSelector('ff_investExperience', 'Investment Experience', investExperience, setInvestExperience, EXPERIENCE_OPTIONS, (v) => ({ riskProfile: { investmentExperience: v } }))}
            {renderChipSelector('ff_reactionToLoss', 'Reaction to Loss', reactionToLoss, setReactionToLoss, REACTION_OPTIONS, (v) => ({ riskProfile: { reactionToLoss: v } }))}
            {renderChipSelector('ff_incomeVsGrowth', 'Income vs Growth', incomeVsGrowth, setIncomeVsGrowth, INCOME_GROWTH_OPTIONS, (v) => ({ riskProfile: { incomeVsGrowth: v } }))}
          </View>
        );
      case 'retirement':
        return (
          <View>
            {renderTextInput('ff_retirementAge', 'Desired Retirement Age', retirementAge, setRetirementAge, { retirement: { desiredRetirementAge: retirementAge.trim() } }, { keyboardType: 'number-pad', placeholder: 'e.g. 65' })}
            {renderTextInput('ff_retirementIncome', 'Desired Retirement Income', retirementIncome, setRetirementIncome, { retirement: { desiredRetirementIncome: retirementIncome.trim() } }, { isCurrency: true, placeholder: 'Annual income' })}
            {renderChipSelector('ff_agedPension', 'Aged Pension Eligibility', agedPension, setAgedPension, YES_NO_UNSURE_OPTIONS, (v) => ({ retirement: { agedPensionEligible: v } }))}
            {renderChipSelector('ff_downsize', 'Downsize Intention', downsize, setDownsize, YES_NO_UNSURE_OPTIONS, (v) => ({ retirement: { downsizeIntention: v } }))}
          </View>
        );
      case 'estate_planning':
        return (
          <View>
            {renderChipSelector('ff_hasWill', 'Has Will', hasWill, setHasWill, YES_NO_OPTIONS, (v) => ({ estatePlanning: { hasWill: v } }))}
            {renderChipSelector('ff_hasPOA', 'Power of Attorney', hasPOA, setHasPOA, YES_NO_OPTIONS, (v) => ({ estatePlanning: { hasPowerOfAttorney: v } }))}
            {renderChipSelector('ff_hasGuardian', 'Enduring Guardian', hasGuardian, setHasGuardian, YES_NO_OPTIONS, (v) => ({ estatePlanning: { hasEnduringGuardian: v } }))}
            {renderChipSelector('ff_hasBDBN', 'Binding Death Benefit Nomination', hasBDBN, setHasBDBN, YES_NO_OPTIONS, (v) => ({ estatePlanning: { hasBDBN: v } }))}
            {renderChipSelector('ff_hasTrust', 'Testamentary Trust', hasTrust, setHasTrust, YES_NO_OPTIONS, (v) => ({ estatePlanning: { hasTestamentaryTrust: v } }))}
          </View>
        );
      case 'health':
        return (
          <View>
            {renderChipSelector('ff_smoker', 'Smoker Status', smoker, setSmoker, YES_NO_OPTIONS, (v) => ({ health: { smoker: v } }))}
            {renderTextInput('ff_preExisting', 'Pre-existing Conditions', preExisting, setPreExisting, { health: { preExistingConditions: preExisting.trim() } }, { placeholder: 'None or describe' })}
            {renderChipSelector('ff_privateHealth', 'Private Health Insurance', privateHealth, setPrivateHealth, YES_NO_OPTIONS, (v) => ({ health: { privateHealthInsurance: v } }))}
            {renderTextInput('ff_healthFund', 'Health Fund Name', healthFund, setHealthFund, { health: { healthFund: healthFund.trim() } }, { placeholder: 'e.g. Medibank, Bupa' })}
            {renderChipSelector('ff_medicareSurcharge', 'Medicare Levy Surcharge', medicareSurcharge, setMedicareSurcharge, YES_NO_UNSURE_OPTIONS, (v) => ({ health: { medicareLevySurcharge: v } }))}
          </View>
        );
      case 'centrelink':
        return (
          <View>
            {renderChipSelector('ff_receivingBenefits', 'Receiving Benefits', receivingBenefits, setReceivingBenefits, YES_NO_OPTIONS, (v) => ({ centrelink: { receivingBenefits: v } }))}
            {renderTextInput('ff_benefitType', 'Benefit Type', benefitType, setBenefitType, { centrelink: { benefitType: benefitType.trim() } }, { placeholder: 'e.g. JobSeeker, Disability' })}
            {renderChipSelector('ff_healthCareCard', 'Health Care Card', healthCareCard, setHealthCareCard, YES_NO_OPTIONS, (v) => ({ centrelink: { healthCareCard: v } }))}
            {renderChipSelector('ff_dvaBenefits', 'DVA Benefits', dvaBenefits, setDvaBenefits, YES_NO_OPTIONS, (v) => ({ centrelink: { dvaBenefits: v } }))}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 120 }} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={['#0C1B2A', '#132D46', '#1B3A5C']} style={[styles.heroGradient, { paddingTop: 0 }]}>
          <CoinHeader title="Fact Find" subtitle="FINANCIAL FACT FIND" transparent />

          <View style={styles.progressCard}>
            <LinearGradient colors={['#1a2942', '#0f1c30']} style={styles.progressCardInner}>
              <View style={styles.progressTopRow}>
                <View>
                  <Text style={styles.progressLabel}>QUEST PROGRESS</Text>
                  <Text style={styles.progressBig}>{progress.percentage}%</Text>
                </View>
                <View style={styles.progressCoinsWrap}>
                  <View style={styles.goldCoinLg}><Text style={styles.goldCoinLgText}>$</Text></View>
                  <Text style={styles.progressCoinsText}>{progress.completed}/{progress.total} fields</Text>
                </View>
              </View>
              <View style={styles.progressBarBg}>
                <LinearGradient colors={['#0D9488', '#2DD4BF']} style={[styles.progressBarFill, { width: `${progress.percentage}%` }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              </View>
            </LinearGradient>
          </View>

          <View style={styles.subTabBar}>
            {([
              { key: 'personal' as SubTab, label: 'Personal' },
              { key: 'financial' as SubTab, label: 'Financial' },
              { key: 'planning' as SubTab, label: 'Planning' },
            ]).map(tab => (
              <Pressable
                key={tab.key}
                onPress={() => { setActiveSubTab(tab.key); setExpandedSection(null); Haptics.selectionAsync(); }}
                style={[styles.subTabItem, activeSubTab === tab.key && styles.subTabItemActive]}
              >
                <Text style={[styles.subTabText, activeSubTab === tab.key && styles.subTabTextActive]}>{tab.label}</Text>
              </Pressable>
            ))}
          </View>
        </LinearGradient>

        {coinToast && (
          <Animated.View style={[styles.coinToast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
            <View style={styles.goldCoinLg}><Text style={styles.goldCoinLgText}>$</Text></View>
            <Text style={styles.coinToastText}>+{coinToast.amount} Good Coins - {coinToast.label}</Text>
          </Animated.View>
        )}

        <View style={styles.body}>
          {filteredSections.map(section => {
            const fieldsComplete = getSectionFieldsCompleted(section);
            const sectionDone = isSectionComplete(section.id);
            const isExpanded = expandedSection === section.id;
            const totalCoins = getSectionTotalCoins(section);

            return (
              <View key={section.id} style={styles.sectionCard}>
                <Pressable style={styles.sectionHeader} onPress={() => { setExpandedSection(isExpanded ? null : section.id); Haptics.selectionAsync(); }}>
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
                        <View style={styles.goldCoinSm}><Text style={styles.goldCoinSmText}>$</Text></View>
                        <Text style={styles.sectionCoinText}>{totalCoins} Good Coins</Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.light.gray400} />
                </Pressable>
                {isExpanded && (
                  <View style={styles.sectionContent}>
                    {sectionDone && (
                      <View style={styles.sectionCompleteBanner}>
                        <Ionicons name="trophy" size={16} color="#F59E0B" />
                        <Text style={styles.sectionCompleteText}>Section complete! +{section.bonusCoins} bonus Good Coins earned</Text>
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  heroGradient: { paddingBottom: 0 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  appName: { fontFamily: 'DMSans_700Bold', fontSize: 28, color: '#FFF', letterSpacing: -0.5 },
  subtitle: { fontFamily: 'DMSans_600SemiBold', fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5, marginTop: 2 },
  headerLogo: { width: 40, height: 40, borderRadius: 20 },
  progressCard: { marginHorizontal: 20, marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  progressCardInner: { padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  progressTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressLabel: { fontFamily: 'DMSans_600SemiBold', fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },
  progressBig: { fontFamily: 'DMSans_700Bold', fontSize: 32, color: Colors.light.tintLight, marginTop: 2 },
  progressCoinsWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  progressCoinsText: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: '#F59E0B' },
  progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: 8, borderRadius: 4 },
  subTabBar: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 0, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 4 },
  subTabItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  subTabItemActive: { backgroundColor: 'rgba(255,255,255,0.15)' },
  subTabText: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  subTabTextActive: { color: '#FFF' },
  coinToast: { position: 'absolute', top: 10, alignSelf: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  coinToastText: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: '#92400E', marginLeft: 8 },
  body: { paddingHorizontal: 20, paddingTop: 20 },
  sectionCard: { backgroundColor: Colors.light.card, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.light.border, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  sectionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.light.text },
  sectionSubtitle: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.light.gray500, marginTop: 2 },
  sectionMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 10 },
  sectionMetaText: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: Colors.light.gray400 },
  sectionCoinBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  sectionCoinText: { fontFamily: 'DMSans_600SemiBold', fontSize: 11, color: '#B45309' },
  sectionContent: { padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: Colors.light.border },
  sectionCompleteBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', padding: 12, borderRadius: 10, marginBottom: 12, marginTop: 12 },
  sectionCompleteText: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: '#92400E' },
  fieldRow: { marginTop: 16 },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  fieldLabel: { fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.light.text },
  coinBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  coinBadgeText: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: '#B45309' },
  inputWrap: { position: 'relative' },
  currencyPrefix: { position: 'absolute', left: 14, top: 14, fontFamily: 'DMSans_600SemiBold', fontSize: 15, color: Colors.light.gray400, zIndex: 1 },
  input: { backgroundColor: Colors.light.gray50, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'DMSans_500Medium', fontSize: 15, color: Colors.light.text, borderWidth: 1, borderColor: Colors.light.border },
  inputDone: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', color: Colors.light.gray400 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.light.gray50, borderWidth: 1, borderColor: Colors.light.border },
  chipActive: { backgroundColor: Colors.light.tint + '15', borderColor: Colors.light.tint },
  chipText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.light.gray500 },
  chipTextActive: { color: Colors.light.tint, fontFamily: 'DMSans_600SemiBold' },
  fieldSectionLabel: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.light.gray500, marginTop: 16, marginBottom: 4 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.light.tint + '10', padding: 12, borderRadius: 10, marginTop: 12 },
  infoCardText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.light.gray500, flex: 1 },
  autoCompleteCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.gray50, padding: 16, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: Colors.light.border },
  autoCompleteTitle: { fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: Colors.light.text },
  autoCompleteSubtext: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.light.gray500, marginTop: 2 },
  allCompleteCard: { backgroundColor: '#FEF3C7', borderRadius: 16, padding: 24, alignItems: 'center', marginTop: 12, marginBottom: 20 },
  allCompleteTitle: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: '#92400E', marginTop: 12 },
  allCompleteSubtext: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.light.gray500, textAlign: 'center', marginTop: 6 },
  switchBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.light.tint, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 16 },
  switchBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: '#FFF' },
  goldCoin: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#F59E0B', alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 1.5, borderColor: '#D4930D' },
  goldCoinDone: { backgroundColor: '#D1D5DB', borderColor: '#B0B5BD' },
  goldCoinText: { fontSize: 7, fontWeight: '800' as const, color: '#7C5800' },
  goldCoinTextDone: { color: '#9CA3AF' },
  goldCoinLg: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#F59E0B', alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 1.5, borderColor: '#D4930D' },
  goldCoinLgText: { fontSize: 9, fontWeight: '800' as const, color: '#7C5800' },
  goldCoinSm: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#F59E0B', alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 1, borderColor: '#D4930D' },
  goldCoinSmText: { fontSize: 6, fontWeight: '800' as const, color: '#7C5800' },
});
