import { useReactiveClient } from "@dynamic-labs/react-hooks";
import { Button } from "@rneui/themed";
import React, { useState, useEffect } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Share,
  Image,
} from "react-native";
import { client } from "../client";
import { supabase } from "../lib/supabase";
import InitialsAvatar from "../components/InitialsAvatar";

const RequestScreen = () => {
  const { wallets, auth } = useReactiveClient(client);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [lastRequest, setLastRequest] = useState<any>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const email = auth.authenticatedUser?.email || "";
      const { data: users, error } = await supabase
        .from("users")
        .select("id, full_name, email, profile_picture_url")
        .neq("email", email)
        .limit(20);
      if (!error && users) {
        setUsers(
          users.map((user: any) => ({
            id: user.id,
            name: user.full_name || user.email,
            email: user.email,
            profilePictureUrl: user.profile_picture_url,
          }))
        );
      }
    };
    fetchUsers();
  }, [auth.authenticatedUser]);

  const filteredRecipients = users.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase())
  );

  // Step 1: Enter Amount
  if (step === 1) {
    const isAmountValid =
      !!amount && !isNaN(Number(amount)) && Number(amount) > 0;
    return (
      <View style={{ flex: 1, backgroundColor: "#fafbfc" }}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Request</Text>
        </View>
        {/* Main Content */}
        <View style={styles.topContentContainer}>
          <Text style={styles.subtitle}>How much ?</Text>
          <TextInput
            style={styles.balanceInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="$0.00"
            textAlign="center"
          />
          <TouchableOpacity
            style={[styles.button, !isAmountValid && styles.buttonDisabled]}
            onPress={() => setStep(2)}
            disabled={!isAmountValid}
          >
            <Text style={styles.buttonText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 2: Select Recipient
  if (step === 2) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fafbfc" }}>
        <TouchableOpacity
          style={styles.backButtonAbsolute}
          onPress={() => setStep(1)}
        >
          <Text style={styles.backButtonText}>{"< Back"}</Text>
        </TouchableOpacity>
        <View style={styles.centerContent}>
          <Text style={styles.header}>Request</Text>
          <Text style={styles.prompt}>Who is this request for?</Text>
          <TextInput
            style={styles.input}
            placeholder="Search name or email or enter address"
            value={search}
            onChangeText={setSearch}
          />
          {search.startsWith("0x") ||
          (search.includes("@") &&
            !filteredRecipients.some((u) => u.email === search)) ? (
            <TouchableOpacity
              style={styles.recipientRow}
              onPress={() => {
                setRecipient(search);
                setSelectedRecipient(null);
                setStep(3);
              }}
            >
              <Text style={styles.recipientName}>{search}</Text>
            </TouchableOpacity>
          ) : null}
          {filteredRecipients.map((item) => (
            <TouchableOpacity
              key={item.email}
              style={styles.recipientRow}
              onPress={() => {
                setRecipient(item.email);
                setSelectedRecipient(item);
                setStep(3);
              }}
            >
              {item.profilePictureUrl ? (
                <Image
                  source={{ uri: item.profilePictureUrl }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    marginRight: 12,
                  }}
                />
              ) : (
                <InitialsAvatar
                  name={item.name || item.email}
                  size={40}
                  style={{ marginRight: 12 }}
                />
              )}
              <View
                style={{
                  flex: 1,
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <Text style={styles.recipientName}>{item.name}</Text>
                <Text style={styles.recipientEmail}>{item.email}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // Step 3: Add Note
  if (step === 3) {
    const isNoteValid = note.trim().length > 0;
    return (
      <View style={{ flex: 1, backgroundColor: "#fafbfc" }}>
        <TouchableOpacity
          style={styles.backButtonAbsolute}
          onPress={() => setStep(2)}
        >
          <Text style={styles.backButtonText}>{"< Back"}</Text>
        </TouchableOpacity>
        <View style={styles.centeredContainer}>
          <Text style={styles.header}>Request</Text>
          <Text style={styles.prompt}>Add a note (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Add a note to your request"
            value={note}
            onChangeText={setNote}
          />
          <TouchableOpacity
            style={[styles.button, !isNoteValid && styles.buttonDisabled]}
            onPress={() => setStep(4)}
            disabled={!isNoteValid}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 4: Review Request
  const handleRequest = async () => {
    if (!amount || !recipient) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    try {
      setIsLoading(true);
      let recipientAddress = recipient;
      let recipientEmail = null;
      let recipientObj = selectedRecipient;
      if (!recipient.startsWith("0x")) {
        const { data, error } = await supabase
          .from("users")
          .select("wallet_address, full_name, email, profile_picture_url")
          .eq("email", recipient)
          .single();
        if (error || !data?.wallet_address) {
          throw new Error("Recipient email not found");
        }
        recipientAddress = data.wallet_address;
        recipientEmail = recipient;
        recipientObj = {
          name: data.full_name || data.email,
          email: data.email,
          profilePictureUrl: data.profile_picture_url,
        };
      }
      setLastRequest({
        amount,
        recipient: recipientObj || { name: recipient, email: recipient },
        note,
      });
      const { data, error } = await supabase
        .from("fund_requests")
        .insert([
          {
            amount: parseFloat(amount),
            recipient_address: recipientAddress,
            recipient_email: recipientEmail || "",
            sender_address: wallets.userWallets[0]?.address,
            sender_email: auth.authenticatedUser?.email || "",
            note: note,
            status: "pending",
          },
        ])
        .select()
        .single();
      if (error) throw error;
      setRequestId(data.id);
      setStep(5);
      setAmount("");
      setRecipient("");
      setNote("");
      setSelectedRecipient(null);
    } catch (error) {
      console.error("Request error:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to create fund request. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };
  if (step === 4) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fafbfc" }}>
        <TouchableOpacity
          style={styles.backButtonAbsolute}
          onPress={() => setStep(3)}
        >
          <Text style={styles.backButtonText}>{"< Back"}</Text>
        </TouchableOpacity>
        <View style={styles.centeredContainer}>
          <Text style={styles.title}>Review Request</Text>
          <View style={styles.reviewCard}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                width: "100%",
              }}
            >
              {selectedRecipient?.profilePictureUrl ? (
                <Image
                  source={{ uri: selectedRecipient.profilePictureUrl }}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    marginRight: 16,
                  }}
                />
              ) : (
                <InitialsAvatar
                  name={
                    selectedRecipient?.name ||
                    selectedRecipient?.email ||
                    recipient
                  }
                  size={56}
                  style={{ marginRight: 16 }}
                />
              )}
              <View
                style={{
                  flex: 1,
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <Text style={styles.reviewName}>
                  {selectedRecipient?.name || recipient}
                </Text>
                <Text style={styles.reviewEmail}>
                  {selectedRecipient?.email || recipient}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.amountLabel}>Amount</Text>
                <Text style={styles.reviewAmount}>${amount}</Text>
              </View>
            </View>
            {note ? (
              <View style={{ width: "100%", marginTop: 18 }}>
                <View style={styles.divider} />
                <Text style={styles.label}>Note</Text>
                <Text style={styles.value}>{note}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={handleRequest}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? "Creating..." : "Create Request"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 5: Confirmation
  if (step === 5) {
    const req = lastRequest || {};
    return (
      <View style={{ flex: 1, backgroundColor: "#fafbfc" }}>
        <View style={styles.centeredContainer}>
          <Text style={styles.title}>Request Sent!</Text>
          <View style={styles.reviewCard}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                width: "100%",
              }}
            >
              {req.recipient?.profilePictureUrl ? (
                <Image
                  source={{ uri: req.recipient.profilePictureUrl }}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    marginRight: 16,
                  }}
                />
              ) : (
                <InitialsAvatar
                  name={req.recipient?.name || req.recipient?.email || ""}
                  size={56}
                  style={{ marginRight: 16 }}
                />
              )}
              <View
                style={{
                  flex: 1,
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <Text style={styles.reviewName}>
                  {req.recipient?.name || ""}
                </Text>
                <Text style={styles.reviewEmail}>
                  {req.recipient?.email || ""}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.amountLabel}>Amount</Text>
                <Text style={styles.reviewAmount}>${req.amount}</Text>
              </View>
            </View>
            {req.note ? (
              <View style={{ width: "100%", marginTop: 18 }}>
                <View style={styles.divider} />
                <Text style={styles.label}>Note</Text>
                <Text style={styles.value}>{req.note}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={styles.button} onPress={() => setStep(1)}>
            <Text style={styles.buttonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // fallback
  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFC",
  },
  headerContainer: {
    width: "100%",
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F4",
    backgroundColor: "#fafbfc",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#222",
    textAlign: "center",
  },
  topContentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 40,
    width: "100%",
  },
  header: {
    fontSize: 18,
    fontWeight: "500",
    color: "#22223A",
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 40,
  },
  prompt: {
    fontSize: 16,
    color: "#A1A1AA",
    fontWeight: "500",
    marginBottom: 10,
  },
  amount: {
    fontSize: 40,
    fontWeight: "700",
    color: "#A1A1AA",
    marginBottom: 40,
  },
  amountValue: {
    fontSize: 40,
    fontWeight: "700",
    color: "#A1A1AA",
  },
  continueButton: {
    width: "90%",
    backgroundColor: "#F1F1F4",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 10,
  },
  continueButtonDisabled: {
    backgroundColor: "#F1F1F4",
  },
  continueButtonText: {
    color: "#A1A1AA",
    fontSize: 16,
    fontWeight: "600",
  },
  continueButtonTextDisabled: {
    color: "#A1A1AA",
  },
  bottomNavContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bottomNavBg: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
    backgroundColor: "#FAFAFC",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomNavContent: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    width: "100%",
    height: 90,
    paddingHorizontal: 30,
    paddingBottom: 10,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  navIcon: {
    fontSize: 24,
    color: "#A1A1AA",
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 13,
    color: "#A1A1AA",
  },
  navItemActiveWrapper: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  navActiveCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#22223A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  navIconActive: {
    fontSize: 24,
    color: "#fff",
  },
  navLabelActive: {
    fontSize: 13,
    color: "#22223A",
    fontWeight: "600",
    marginTop: 2,
  },
  input: {
    width: "90%",
    height: 40,
    borderColor: "#F1F1F4",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  recipientRow: {
    width: "90%",
    padding: 10,
    borderColor: "#F1F1F4",
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  recipientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#22223A",
  },
  recipientEmail: {
    fontSize: 13,
    color: "#A1A1AA",
  },
  card: {
    width: "90%",
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 20,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 13,
    color: "#A1A1AA",
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    color: "#22223A",
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: "#fafbfc",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
    color: "#222",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#888",
    marginBottom: 8,
    textAlign: "center",
  },
  balanceInput: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 18,
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
  },
  button: {
    backgroundColor: "#4F7CFE",
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    marginTop: 16,
    width: "100%",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  backButtonAbsolute: {
    position: "absolute",
    top: 48, // or adjust for your status bar
    left: 24,
    zIndex: 10,
  },
  backButtonText: {
    color: "#4F7CFE",
    fontSize: 16,
    fontWeight: "500",
  },
  reviewCard: {
    width: "90%",
    padding: 24,
    backgroundColor: "#fff",
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  reviewName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#22223A",
  },
  reviewEmail: {
    fontSize: 13,
    color: "#A1A1AA",
    marginTop: 2,
  },
  reviewAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4F7CFE",
    marginTop: 2,
  },
  amountLabel: {
    fontSize: 13,
    color: "#A1A1AA",
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F1F4",
    marginVertical: 12,
    width: "100%",
  },
});

export default RequestScreen;
