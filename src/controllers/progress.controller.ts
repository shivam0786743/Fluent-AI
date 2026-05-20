import { type Response } from 'express';
import User from '../models/user.model.js';
import Session from '../models/session.model.js';
import { type AuthRequest } from '../middleware/auth.middleware.js';

// GET /api/progress/summary
// Returns weekly practice minutes, weekly session count, current streak, and weekly activity map (Mon-Sun).
export const getSummary = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user.id;
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Calculate start of current week (Monday 00:00:00)
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    // Calculate end of current week (Sunday 23:59:59)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Fetch all completed sessions of user for the current week
    const sessions = await Session.find({
      user_id: userId,
      status: 'completed',
      createdAt: {
        $gte: startOfWeek,
        $lte: endOfWeek,
      },
    });

    // Sum week minutes and count sessions
    let week_minutes = 0;
    sessions.forEach((session) => {
      week_minutes += session.duration_minutes || 0;
    });
    const week_sessions = sessions.length;

    // Create streak map (Monday to Sunday)
    const streak_map = [false, false, false, false, false, false, false];
    sessions.forEach((session) => {
      const sessionDate = new Date(session.createdAt);
      const sessionDay = sessionDate.getDay();
      const mapIndex = sessionDay === 0 ? 6 : sessionDay - 1;
      streak_map[mapIndex] = true;
    });

    // Get current streak count from User record
    const user = await User.findById(userId);
    const streak_days = user ? user.streak_days || 0 : 0;

    res.status(200).json({
      week_minutes,
      week_sessions,
      streak_days,
      streak_map,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/progress/fluency-trend
// Returns average fluency scores for each of the last 7 calendar days.
export const getFluencyTrend = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user.id;
    const trend = [];
    const today = new Date();

    // Iterate backwards for the last 7 days (including today)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const startOfDay = new Date(d);
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);

      // Find completed sessions for this specific day
      const daySessions = await Session.find({
        user_id: userId,
        status: 'completed',
        createdAt: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      });

      let sum = 0;
      let count = 0;
      daySessions.forEach((s) => {
        if (s.fluency_score !== undefined) {
          sum += s.fluency_score;
          count++;
        }
      });

      const score = count > 0 ? Math.round(sum / count) : 0;
      const dateString = d.toISOString().split('T')[0];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayName = dayNames[d.getDay()];

      trend.push({
        date: dateString,
        day: dayName,
        score,
      });
    }

    res.status(200).json(trend);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/progress/overall-score
// Returns overall percentage score across all completed sessions.
export const getOverallScore = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user.id;
    const sessions = await Session.find({
      user_id: userId,
      status: 'completed',
    });

    if (sessions.length === 0) {
      return res.status(200).json({ overall_score: 0 });
    }

    let totalSum = 0;
    let totalCount = 0;
    sessions.forEach((s) => {
      let sessionSum = 0;
      let sessionCount = 0;

      if (s.grammar_score !== undefined) {
        sessionSum += s.grammar_score;
        sessionCount++;
      }
      if (s.vocabulary_score !== undefined) {
        sessionSum += s.vocabulary_score;
        sessionCount++;
      }
      if (s.pronunciation_score !== undefined) {
        sessionSum += s.pronunciation_score;
        sessionCount++;
      }
      if (s.fluency_score !== undefined) {
        sessionSum += s.fluency_score;
        sessionCount++;
      }

      if (sessionCount > 0) {
        totalSum += sessionSum / sessionCount;
        totalCount++;
      }
    });

    const overall_score = totalCount > 0 ? Math.round(totalSum / totalCount) : 0;
    res.status(200).json({ overall_score });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/progress/skills-breakdown
// Returns individual score averages: Grammar, Vocabulary, Pronunciation, Fluency.
export const getSkillsBreakdown = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user.id;
    const sessions = await Session.find({
      user_id: userId,
      status: 'completed',
    });

    let grammarSum = 0, grammarCount = 0;
    let vocabSum = 0, vocabCount = 0;
    let pronSum = 0, pronCount = 0;
    let fluencySum = 0, fluencyCount = 0;

    sessions.forEach((s) => {
      if (s.grammar_score !== undefined) {
        grammarSum += s.grammar_score;
        grammarCount++;
      }
      if (s.vocabulary_score !== undefined) {
        vocabSum += s.vocabulary_score;
        vocabCount++;
      }
      if (s.pronunciation_score !== undefined) {
        pronSum += s.pronunciation_score;
        pronCount++;
      }
      if (s.fluency_score !== undefined) {
        fluencySum += s.fluency_score;
        fluencyCount++;
      }
    });

    res.status(200).json({
      grammar: grammarCount > 0 ? Math.round(grammarSum / grammarCount) : 0,
      vocabulary: vocabCount > 0 ? Math.round(vocabSum / vocabCount) : 0,
      pronunciation: pronCount > 0 ? Math.round(pronSum / pronCount) : 0,
      fluency: fluencyCount > 0 ? Math.round(fluencySum / fluencyCount) : 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/progress/streak
// Returns current streak, longest streak, and daily log of practice days.
export const getStreak = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user.id;
    const sessions = await Session.find({
      user_id: userId,
      status: 'completed',
    }).sort({ createdAt: 1 });

    const activeDates = Array.from(
      new Set(
        sessions.map((s) => s.createdAt.toISOString().split('T')[0])
      )
    );

    let longest_streak = 0;
    let current_streak = 0;

    if (activeDates.length > 0) {
      let tempStreak = 0;
      let lastDate: Date | null = null;

      // Calculate longest streak
      for (let i = 0; i < activeDates.length; i++) {
        const currentDate = new Date(activeDates[i]);
        if (lastDate === null) {
          tempStreak = 1;
        } else {
          const diffTime = currentDate.getTime() - lastDate.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            tempStreak++;
          } else if (diffDays > 1) {
            longest_streak = Math.max(longest_streak, tempStreak);
            tempStreak = 1;
          }
        }
        lastDate = currentDate;
      }
      longest_streak = Math.max(longest_streak, tempStreak);

      // Calculate current streak
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const hasToday = activeDates.includes(todayStr);
      const hasYesterday = activeDates.includes(yesterdayStr);

      if (hasToday || hasYesterday) {
        let activeStreak = 1;
        let checkDate = new Date(activeDates[activeDates.length - 1]);

        for (let j = activeDates.length - 2; j >= 0; j--) {
          const prevDate = new Date(activeDates[j]);
          const diffTime = checkDate.getTime() - prevDate.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            activeStreak++;
            checkDate = prevDate;
          } else {
            break;
          }
        }
        current_streak = activeStreak;
      }
    }

    res.status(200).json({
      current_streak,
      longest_streak,
      daily_log: activeDates,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
