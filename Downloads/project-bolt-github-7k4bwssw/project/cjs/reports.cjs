@@ .. @@
 const express = require('express');
 const ExcelJS = require('exceljs');
 const PDFDocument = require('pdfkit');
-const Response = require('../server/models/Response');
-const Exam = require('../server/models/Exam');
-const Report = require('../server/models/Report');
+const Response = require('../models/Response.cjs');
+const Exam = require('../models/Exam.cjs');
+const Report = require('../models/Report.cjs');