import { db } from "./config";
import { doc, setDoc, updateDoc, increment } from "firebase/firestore";

export async function recordQuestionStat(questionId, levelId, isCorrect, chosenIndex) {
  try {
    const ref = doc(db, "questionStats", String(questionId));
    const update = {
      totalAttempts: increment(1),
      levelId: Number(levelId),
    };
    if (isCorrect) {
      update.correctCount = increment(1);
    } else {
      update[`wrongByOption.${chosenIndex}`] = increment(1);
    }
    try {
      await updateDoc(ref, update);
    } catch (e) {
      if (e.code === "not-found") {
        await setDoc(ref, {
          totalAttempts: 1,
          correctCount: isCorrect ? 1 : 0,
          levelId: Number(levelId),
          wrongByOption: isCorrect ? {} : { [String(chosenIndex)]: 1 },
        });
      } else {
        throw e;
      }
    }
  } catch (e) {
    console.warn("recordQuestionStat failed:", e);
  }
}
