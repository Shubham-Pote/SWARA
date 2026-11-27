import { Request, Response } from 'express';
import { FilterQuery, isObjectIdOrHexString, Types } from 'mongoose';
import { z } from 'zod';
import Lesson, { ILesson } from '../models/lesson';
import Note, { INote, NOTE_CONTENT_MAX_LENGTH, NOTE_LANGUAGES, NOTE_TITLE_MAX_LENGTH, NOTE_TOPICS } from '../models/note';
import UserStats from '../models/userStats';

const noteLanguage = z.enum(NOTE_LANGUAGES);
const noteSection = z.enum(['all', 'ai-generated', 'my-notes', 'starred']);

const noteFilters = z.object({
  language: noteLanguage.optional(),
  section: noteSection.optional(),
  topic: z.string().trim().optional(),
  starred: z.enum(['true', 'false']).optional(),
  search: z.string().max(NOTE_CONTENT_MAX_LENGTH).optional()
});

const noteFields = z.object({
  title: z.string().trim().min(1).max(NOTE_TITLE_MAX_LENGTH),
  content: z.string().trim().min(1).max(NOTE_CONTENT_MAX_LENGTH),
  topic: z.string().trim().optional()
    .pipe(z.union([z.enum(NOTE_TOPICS), z.literal(''), z.undefined()]))
    .transform(topic => topic || undefined),
  tags: z.array(z.string().trim()).default([]).transform(tags => tags.filter(Boolean))
});
const createNoteInput = noteFields.extend({
  language: noteLanguage,
  readingId: z.string().refine(isObjectIdOrHexString).optional()
});

const summaryInput = z.object({
  lessonId: z.string().refine(isObjectIdOrHexString),
  language: noteLanguage
});

export const getUserNotes = async (req: Request, res: Response): Promise<void> => {
  const parsed = noteFilters.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid note filters' });
    return;
  }

  const { topic, starred, search, language } = parsed.data;
  // Older clients send section filters in the topic parameter.
  const sectionFromTopic = noteSection.safeParse(topic?.toLowerCase());
  const section = parsed.data.section ?? (sectionFromTopic.success ? sectionFromTopic.data : undefined);
  const filter: FilterQuery<INote> = { userId: req.user!.userId };

  if (topic && !sectionFromTopic.success) filter.topic = topic;
  if (starred === 'true' || section === 'starred') filter.starred = true;
  if (language) filter.language = language;
  if (section === 'ai-generated') filter.aiGenerated = true;
  if (section === 'my-notes') filter.aiGenerated = { $ne: true };
  if (search) {
    const literalSearch = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: literalSearch }, { content: literalSearch }, { tags: literalSearch }];
  }

  try {
    const notes = await Note.find(filter)
      .sort({ starred: -1, createdAt: -1 })
      .populate('lessonId', 'title difficulty');
    res.json({ success: true, notes, total: notes.length });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ success: false, message: 'Error fetching notes' });
  }
};

export const createNote = async (req: Request, res: Response): Promise<void> => {
  const parsed = createNoteInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid note title, content, language, topic, or tags' });
    return;
  }

  try {
    const note = await Note.create({ userId: req.user!.userId, ...parsed.data });
    await incrementNotesStats(note, 'notesCreated');
    res.status(201).json({ success: true, message: 'Note created successfully', note });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ success: false, message: 'Error creating note' });
  }
};

export const updateNote = async (req: Request, res: Response): Promise<void> => {
  const { noteId } = req.params;
  if (!isObjectIdOrHexString(noteId)) {
    res.status(400).json({ success: false, message: 'Invalid note ID' });
    return;
  }
  const parsed = noteFields.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid note title, content, topic, or tags' });
    return;
  }

  const { topic, ...fields } = parsed.data;
  try {
    const note = await Note.findOneAndUpdate(
      { _id: noteId, userId: req.user!.userId },
      { $set: { ...fields, derivedTitle: false, ...(topic && { topic }) }, ...(!topic && { $unset: { topic: 1 } }), $inc: { revision: 1 } },
      { new: true, runValidators: true }
    ).populate('lessonId', 'title difficulty');
    if (!note) {
      res.status(404).json({ success: false, message: 'Note not found' });
      return;
    }
    res.json({ success: true, message: 'Note updated successfully', note });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ success: false, message: 'Error updating note' });
  }
};

const pageInput = z.object({
  content: z.string().max(NOTE_CONTENT_MAX_LENGTH),
  title: z.string().trim().max(NOTE_TITLE_MAX_LENGTH).optional(),
  language: noteLanguage,
  revision: z.number().int().min(-1),
  writeId: z.string().uuid(),
  tags: z.array(z.string().trim()).optional(),
  topic: z.enum(NOTE_TOPICS).nullable().optional()
}).refine(({ content, title }) => Boolean(content.trim() || title));

export async function savePage(req: Request, res: Response): Promise<void> {
  const input = pageInput.safeParse(req.body);
  if (!input.success || !isObjectIdOrHexString(req.params.noteId)) {
    res.status(400).json({ message: 'Invalid notebook page' });
    return;
  }
  const { content, title, revision, writeId, language, tags, topic } = input.data;
  const owner = { _id: req.params.noteId, userId: req.user!.userId, language };
  const fields = { content, title: title || content.trimStart().split(/\r?\n/, 1)[0].trim().slice(0, NOTE_TITLE_MAX_LENGTH),
    derivedTitle: !title, revision: revision + 1, writeId, ...(tags && { tags }), ...(topic && { topic }) };
  try {
    if (revision === -1) {
      try {
        const note = await Note.create({ ...owner, ...fields });
        await incrementNotesStats(note, 'notesCreated');
        res.status(201).json({ note });
        return;
      } catch (error) {
        if ((error as {code?: number}).code !== 11000) throw error;
      }
    } else {
      const version = revision === 0 ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] } : { revision };
      const note = await Note.findOneAndUpdate({ ...owner, ...version }, { $set: fields, ...(topic === null && { $unset: { topic: 1 } }) },
        { new: true, runValidators: true }).populate('lessonId', 'title difficulty');
      if (note) { res.json({ note }); return; }
    }
    const replay = await Note.findOne({ ...owner, writeId, revision: revision + 1 }).populate('lessonId', 'title difficulty');
    if (replay) res.json({ note: replay });
    else res.status(409).json({ message: 'This page changed. Keep your edits as a separate note.' });
  } catch {
    res.status(500).json({ message: 'Could not save notebook page' });
  }
}

function formatGlossaryEntry(term: string, { translation, pronunciation, example }: ILesson['steps'][number]['content']) {
  const meaning = translation ? ` - ${translation}` : '';
  const reading = pronunciation ? ` *(${pronunciation})*` : '';
  return [`• **${term}**${meaning}${reading}`, ...(example ? [`  💡 *${example}*`] : [])];
}

function formatLessonNotes(lesson: ILesson) {
  const sections = [
    `# ${lesson.title}`,
    `**Difficulty:** ${lesson.difficulty} | **Time:** ${lesson.estimatedMinutes} min`
  ];
  if (lesson.description) sections.push(`## 📖 Overview\n${lesson.description}`);

  const vocabulary: string[] = [];
  const phrases: string[] = [];
  const grammar: string[] = [];
  for (const step of lesson.steps ?? []) {
    if (!step) continue;
    const { type, title, content = {} } = step;
    if (type === 'vocabulary' && content?.word) vocabulary.push(...formatGlossaryEntry(content.word, content));
    if (type === 'phrase' && content?.phrase) phrases.push(...formatGlossaryEntry(content.phrase, content));
    if (type === 'grammar' && (content?.notes || title)) {
      grammar.push(`• **${title}**: ${content?.notes || 'Grammar concept covered'}`);
    }
    if (type === 'dialogue') {
      for (const line of content?.dialogue ?? []) {
        if (line?.text && line.translation) phrases.push(`• **${line.text}** - ${line.translation}`);
      }
    }
  }

  if (vocabulary.length) sections.push(`## 🔤 Key Vocabulary\n${vocabulary.join('\n')}`);
  if (phrases.length) sections.push(`## 💬 Essential Phrases\n${phrases.join('\n')}`);
  if (grammar.length) sections.push(`## 📚 Grammar Points\n${grammar.join('\n')}`);
  if (lesson.culturalNotes) sections.push(`## 🌍 Cultural Context\n${lesson.culturalNotes}`);

  sections.push([
    '## 📝 Study Tips',
    '• Review vocabulary daily for better retention',
    '• Practice phrases in different contexts',
    '• Focus on pronunciation using the guides',
    '• Create your own sentences with new words'
  ].join('\n'));
  sections.push(`---\n*AI-generated notes from "${lesson.title}" lesson*`);

  const content = sections.join('\n\n');
  const shortened = '\n\n*Summary shortened to fit the note.*';
  return content.length <= NOTE_CONTENT_MAX_LENGTH
    ? content
    : content.slice(0, NOTE_CONTENT_MAX_LENGTH - shortened.length).trimEnd() + shortened;
}

export const generateLessonNotes = async (req: Request, res: Response): Promise<void> => {
  const parsed = summaryInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'A valid lesson ID and language are required' });
    return;
  }

  try {
    const userId = new Types.ObjectId(req.user!.userId);
    const lesson = await Lesson.findById(parsed.data.lessonId);
    if (!lesson) {
      res.status(404).json({ success: false, message: 'Lesson not found' });
      return;
    }

    const reference = { userId, lessonId: lesson._id, aiGenerated: true };
    let note = await Note.findOne(reference).sort({ createdAt: 1, _id: 1 });
    let created = false;
    if (!note) {
      await Note.init();
      const suffix = ' - Study Notes';
      const now = new Date();
      const result = await Note.findOneAndUpdate(
        { summaryKey: `${userId}:${lesson._id}` },
        {
          $setOnInsert: {
            ...reference,
            title: lesson.title.slice(0, NOTE_TITLE_MAX_LENGTH - suffix.length) + suffix,
            content: formatLessonNotes(lesson),
            language: lesson.language,
            topic: lesson.difficulty,
            tags: ['ai-generated', 'lesson-notes', lesson.difficulty.toLowerCase()],
            createdAt: now,
            updatedAt: now
          }
        },
        { upsert: true, new: true, includeResultMetadata: true, runValidators: true, timestamps: false }
      );
      note = result.value;
      created = Boolean(result.lastErrorObject?.upserted);
    }

    if (!note) throw new Error('Lesson summary upsert returned no note');
    if (created) await incrementNotesStats(note, 'lessonSummaries');

    res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'AI study notes generated successfully' : 'Notes already exist for this lesson',
      note,
      ...(created ? {} : { alreadyExists: true })
    });
  } catch (error) {
    console.error('Generate lesson notes error:', error);
    res.status(500).json({ success: false, message: 'Error generating lesson notes' });
  }
};

export const toggleNoteStar = async (req: Request, res: Response): Promise<void> => {
  const { noteId } = req.params;
  if (!isObjectIdOrHexString(noteId)) {
    res.status(400).json({ success: false, message: 'Invalid note ID' });
    return;
  }

  try {
    const note = await Note.findOneAndUpdate(
      { _id: noteId, userId: req.user!.userId },
      [{ $set: { starred: { $not: ['$starred'] } } }],
      { new: true }
    ).select('starred');

    if (!note) {
      res.status(404).json({ success: false, message: 'Note not found' });
      return;
    }

    res.json({ success: true, message: `Note ${note.starred ? 'starred' : 'unstarred'}`, starred: note.starred });
  } catch (error) {
    console.error('Toggle note star error:', error);
    res.status(500).json({ success: false, message: 'Error updating note star status' });
  }
};

export const deleteNote = async (req: Request, res: Response): Promise<void> => {
  const { noteId } = req.params;
  if (!isObjectIdOrHexString(noteId)) {
    res.status(400).json({ success: false, message: 'Invalid note ID' });
    return;
  }

  try {
    const note = await Note.findOneAndDelete({ _id: noteId, userId: req.user!.userId });
    if (!note) {
      res.status(404).json({ success: false, message: 'Note not found' });
      return;
    }

    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ success: false, message: 'Error deleting note' });
  }
};

export const getNotesStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [result] = await Note.aggregate<{
      counts: { totalNotes: number; aiGenerated: number; starred: number }[];
      tags: { count: number }[];
    }>([
      { $match: { userId: new Types.ObjectId(req.user!.userId) } },
      {
        $facet: {
          counts: [{
            $group: {
              _id: null,
              totalNotes: { $sum: 1 },
              aiGenerated: { $sum: { $cond: [{ $eq: ['$aiGenerated', true] }, 1, 0] } },
              starred: { $sum: { $cond: [{ $eq: ['$starred', true] }, 1, 0] } }
            }
          }],
          tags: [{ $unwind: '$tags' }, { $group: { _id: '$tags' } }, { $count: 'count' }]
        }
      }
    ]);
    const { totalNotes = 0, aiGenerated = 0, starred = 0 } = result?.counts[0] ?? {};

    res.json({
      success: true,
      stats: { totalNotes, aiGenerated, starred, myNotes: totalNotes - aiGenerated, uniqueTags: result?.tags[0]?.count ?? 0 }
    });
  } catch (error) {
    console.error('Notes stats error:', error);
    res.status(500).json({ success: false, message: 'Error fetching notes statistics' });
  }
};

async function incrementNotesStats(note: INote, counter: 'notesCreated' | 'lessonSummaries') {
  try {
    await UserStats.updateOne(
      { userId: note.userId },
      { $inc: { [`${note.language}.studyMore.${counter}`]: 1 } },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error updating notes stats:', error);
  }
}
