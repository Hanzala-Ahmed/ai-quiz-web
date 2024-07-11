const Exam = require('../models/examModel');
const User = require('../models/userModel');
const Question = require('../models/questionModel');
const { Configuration, OpenAIApi } = require('openai');

// async function generateQuestions(topic, numberOfQuestions) {
//   const configuration = new Configuration({
//     apiKey: process.env.OPENAI_API_KEY,
//   });

//   const openai = new OpenAIApi(configuration);
//   let questions = [];
//   for (let i = 0; i < numberOfQuestions; i++) {
//     const response = await openai.createCompletion({
//       model: 'text-davinci-003',
//       prompt: `Generate a unique question about ${topic}:`,
//       max_tokens: 100,
//     });
//     console.log(response.data.choices[0].text.trim(), 'response question');
//     questions.push(response.data.choices[0].text.trim());
//   }
//   return questions;
// }

// add questions to the database and after that question save id in array and if already exist then return the id of question and push into array then return all array of questionsids
async function addAiQuestions(topic, numberOfQuestions, exam) {
  const questions = require(`../data/${topic.charAt(0).toUpperCase() + topic.slice(1)}.json`);
  console.log(questions, topic, numberOfQuestions, exam, 'Loaded questions'); // Shows loaded questions
  let selectedQuestions = [];

  for (let i = 0; i < numberOfQuestions; i++) {
    const randomIndex = Math.floor(Math.random() * questions.length);
    const question = questions[randomIndex];
    console.log(question, 'Selected question'); // Shows each selected question

    const questionExists = await Question.findOne({ name: question.name });
    console.log(questionExists, 'Check if question exists'); // Check the result of the DB query

    if (questionExists) {
      selectedQuestions.push(questionExists._id);
    } else {
      const newQuestion = new Question({ ...question, exam: exam });
      const savedQuestion = await newQuestion.save();
      console.log(savedQuestion, 'New question saved'); // Shows saved new question
      selectedQuestions.push(savedQuestion._id);
    }
  }

  console.log(selectedQuestions, 'Final selected questions'); // Final log of selected questions
  return selectedQuestions;
}

async function getQuestions(topic, numberOfQuestions) {
  const questions = require(`../data/${topic.charAt(0).toUpperCase() + topic.slice(1)}.json`);

  console.log(questions, 'questions');

  let selectedQuestions = [];
  for (let i = 0; i < numberOfQuestions; i++) {
    const randomIndex = Math.floor(Math.random() * questions.length);
    selectedQuestions.push(questions[randomIndex]);
  }
  return selectedQuestions;
}

const addExam = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.body.userid,
    });
    if (user.isAdmin) {
      const examExists = await Exam.findOne({ name: req.body.name });
      console.log(examExists);
      if (examExists) {
        res.send({
          message: 'Exam already exists',
          success: false,
        });
      } else {
        req.body.questions = [];
        const newExam = new Exam(req.body);
        await newExam.save();
        res.send({
          message: 'Exam added successfully',
          success: true,
        });
      }
    } else {
      res.send({
        // complete message
        message: 'Cannot add exam. Only Admin can add exams.',
        success: false,
      });
    }
  } catch (error) {
    res.send({
      message: error.message,
      data: error,
      success: false,
    });
  }
};

const getAllExams = async (req, res) => {
  try {
    const exam = await Exam.find();
    if (exam) {
      res.send({
        message: 'Exams list fetched successfully.',
        data: exam,
        success: true,
      });
    } else {
      res.send({
        message: 'No exams to display.',
        data: exam,
        success: false,
      });
    }
  } catch (error) {
    res.send({
      message: error.message,
      data: error,
      success: false,
    });
  }
};

const getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate('questions');
    if (exam) {
      res.send({
        message: 'Exam data fetched successfully.',
        data: exam,
        success: true,
      });
    } else {
      res.send({
        message: 'Exam doesnot exists.',
        data: exam,
        success: false,
      });
    }
  } catch (error) {
    res.send({
      message: error.message,
      data: error,
      success: false,
    });
  }
};

// edit exam by id
const editExam = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.body.userid });
    if (user.isAdmin) {
      const exam = await Exam.findOne({ _id: req.params.id });
      if (exam) {
        exam.name = req.body.name;
        exam.duration = req.body.duration;
        exam.category = req.body.category;
        exam.totalQuestions = req.body.totalQuestions;
        exam.totalMarks = req.body.totalMarks;
        exam.passingMarks = req.body.passingMarks;
        exam.save();
        res.send({
          message: 'Exam details edited successfully.',
          data: exam,
          success: true,
        });
      } else {
        res.send({
          message: "Exam doesn't exists.",
          data: null,
          success: false,
        });
      }
    } else {
      res.send({
        message: 'Cannot Update Exam Details.',
        data: null,
        success: false,
      });
    }
  } catch (error) {
    res.send({
      message: error.message,
      data: error,
      success: false,
    });
  }
};

const deleteExam = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.body.userid });
    if (user.isAdmin) {
      const exam = await Exam.findOne({ _id: req.params.id });
      if (exam) {
        exam.delete();
        res.send({
          message: 'Selected exam deleted successfully.',
          data: null,
          success: true,
        });
      } else {
        res.send({
          message: "Exam doesn't exists.",
          data: null,
          success: false,
        });
      }
    } else {
      res.send({
        message: 'Cannot Delete Exam.',
        data: null,
        success: false,
      });
    }
  } catch (error) {
    res.send({
      message: error.message,
      data: error,
      success: false,
    });
  }
};

const addQuestionToExam = async (req, res) => {
  try {
    const user = await User.findById(req.body.userid);
    if (user.isAdmin) {
      // add question to Questions Collection
      const exam = await Exam.findOne({ _id: req.params.id });
      if (exam.questions.length == exam.totalQuestions) {
        res.send({
          message: 'Questions already added. Please edit the exam to add more questions.',
          success: false,
        });
        return;
      }
      const newQuestion = new Question(req.body);
      const question = await newQuestion.save();
      // add question to exam
      exam.questions.push(question._id);
      await exam.save();
      res.send({
        message: 'Question added successfully.',
        data: null,
        success: true,
      });
    } else {
      res.send({
        message: 'Question cannot be added.',
        data: null,
        success: false,
      });
    }
  } catch (error) {
    console.log(error.message);
    res.send({
      message: error.message,
      data: error,
      success: false,
    });
  }
};

const editQuestionInExam = async (req, res) => {
  try {
    const user = await User.findById(req.body.userid);
    if (user.isAdmin) {
      await Question.findByIdAndUpdate(req.body.questionId, req.body);
      res.send({
        message: 'Question edited successfully',
        success: true,
      });
    } else {
      res.send({
        message: 'Question cannot be edited.',
        success: false,
      });
    }
  } catch (error) {
    res.send({
      message: error.message,
      data: error,
      success: false,
    });
  }
};

const deleteQuestionFromExam = async (req, res) => {
  try {
    const user = await User.findById(req.body.userid);
    if (user.isAdmin) {
      // delete question from the questions collection
      const question = await Question.findOne({ _id: req.body.questionId });
      await question.delete();
      // delete question in exam
      const exam = await Exam.findOne({ _id: req.params.id });
      const questions = exam.questions;
      exam.questions = questions.filter((question) => {
        if (question._id != req.body.questionId) {
          return question._id != req.body.questionId;
        }
      });
      await exam.save();
      res.send({
        message: 'Selected question deleted successfully',
        success: true,
      });
    } else {
      res.send({
        message: 'Question cannot be deleted.',
        success: false,
      });
    }
  } catch (error) {
    res.send({
      message: error.message,
      data: error,
      success: false,
    });
  }
};

const generateAiQuestions = async (req, res) => {
  try {
    console.log(req.params.id, 'id new 1');
    const exam = await Exam.findOne({ _id: req.params.id });
    if (exam) {
      if (exam.questions.length != exam.totalQuestions) {
        const questions = await addAiQuestions(
          exam.category,
          exam.totalQuestions - exam.questions.length,
          exam._id
        );
        exam.questions = questions;
        await exam.save();
        res.send({
          message: 'Questions added successfully.',
          success: true,
        });
      } else {
        res.send({
          message: 'Questions already added. Please edit the exam to add more questions.',
          success: false,
        });
      }
    } else {
      res.send({
        message: 'Exam not found.',
        success: false,
      });
    }
  } catch (error) {
    res.send({
      message: error.message,
      data: error,
      success: false,
    });
  }
};

module.exports = {
  addExam,
  getAllExams,
  getExamById,
  editExam,
  deleteExam,
  addQuestionToExam,
  editQuestionInExam,
  deleteQuestionFromExam,
  generateAiQuestions,
};
