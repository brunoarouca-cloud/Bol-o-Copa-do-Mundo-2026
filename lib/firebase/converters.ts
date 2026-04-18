import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from "firebase/firestore";
import type { Game, UserDoc, Bet, NominalBet, ScoringSettings, NewsArticle } from "@/types";

function createConverter<T extends DocumentData>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T): DocumentData {
      return data;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
      const data = snapshot.data(options);
      return { id: snapshot.id, ...data } as T;
    },
  };
}

export const gameConverter = createConverter<Game>();
export const userConverter = createConverter<UserDoc>();
export const betConverter = createConverter<Bet>();
export const nominalBetConverter = createConverter<NominalBet>();
export const scoringConverter = createConverter<ScoringSettings>();
export const newsConverter = createConverter<NewsArticle>();
