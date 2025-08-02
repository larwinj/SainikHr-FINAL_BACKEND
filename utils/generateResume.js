const PDFDocument = require('pdfkit');

function generateResume(resumeData, res) {
  // Initialize PDF Document
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.addPage = () => {}; // Force single page

  // Set response headers for PDF download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=resume-${resumeData.userId}.pdf`);

  // Pipe PDF directly to response
  doc.pipe(res);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const sidebarWidth = pageWidth * 0.3;
  const sidebarColor = '#253344';
  const textColor = '#000000';
  const defaultFontSize = 10;

  // Draw Profile Image
  function drawProfileImage() {
    const names = resumeData.name ? resumeData.name.split(' ') : ['NA'];
    const initials = names.slice(0, 2).map(n => n.charAt(0).toUpperCase()).join('');
    doc.save();
    doc.fillColor('#4A5A6A')
       .circle(sidebarWidth / 2, 60, 40)
       .fill();
    doc.fillColor('white')
       .font('Helvetica-Bold')
       .fontSize(20)
       .text(initials, sidebarWidth / 2 - 10, 50, { width: 40, align: 'center' });
    doc.restore();
  }

  // Draw Sidebar
  function drawSidebar() {
    doc.rect(0, 0, sidebarWidth, pageHeight).fill(sidebarColor);
    drawProfileImage();
    let y = 120;

    function sidebarText(y, text, fontSize = 10, bold = false) {
      doc.fillColor('white')
         .font(bold ? 'Helvetica-Bold' : 'Helvetica')
         .fontSize(fontSize)
         .text(text, 20, y, { width: sidebarWidth - 40, lineGap: 2 });
      const usedHeight = doc.heightOfString(text, { width: sidebarWidth - 40, fontSize, lineGap: 2 });
      return y + usedHeight + 5;
    }

    y = sidebarText(y, "CONTACT", 12, true);
    for (let [label, value] of Object.entries(resumeData.contact || {})) {
      y = sidebarText(y, `${label}: ${value}`);
    }
    y += 5;

    y = sidebarText(y, "EDUCATION", 12, true);
    (resumeData.education || []).forEach(edu => {
      y = sidebarText(y, edu.years, 10, true);
      y = sidebarText(y, edu.institution, 10);
      y = sidebarText(y, `${edu.degree} - ${edu.percentage}`, 10);
    });
    y += 5;

    y = sidebarText(y, "SKILLS", 12, true);
    y = sidebarText(y, Array.isArray(resumeData.skills) ? resumeData.skills.join(', ') : '', 10);
  }

  // Section Title Helper
  function sectionTitle(y, title) {
    doc.fillColor(textColor)
       .font('Helvetica-Bold')
       .fontSize(14)
       .text(title.toUpperCase(), sidebarWidth + 20, y, { width: pageWidth - sidebarWidth - 40 });
    doc.moveTo(sidebarWidth + 20, y + 18)
       .lineTo(pageWidth - 40, y + 18)
       .stroke();
    return y + 25;
  }

  // Render Sidebar
  drawSidebar();

  // Main Content
  let y = 60;
  doc.fillColor(textColor)
     .font('Helvetica-Bold')
     .fontSize(24)
     .text(resumeData.name.toUpperCase(), sidebarWidth + 20, y, { width: pageWidth - sidebarWidth - 40 });
  y += doc.heightOfString(resumeData.name.toUpperCase(), { width: pageWidth - sidebarWidth - 40 }) + 8;

  doc.font('Helvetica')
     .fontSize(14)
     .text(resumeData.title, sidebarWidth + 20, y, { width: pageWidth - sidebarWidth - 40 });
  y += doc.heightOfString(resumeData.title, { width: pageWidth - sidebarWidth - 40 }) + 12;

  y = sectionTitle(y, "Profile");
  doc.font('Helvetica')
     .fontSize(defaultFontSize)
     .text(resumeData.profile, sidebarWidth + 20, y, { width: pageWidth - sidebarWidth - 40, lineGap: 4 });
  y += doc.heightOfString(resumeData.profile, { width: pageWidth - sidebarWidth - 40, lineGap: 4 }) + 8;

  y = sectionTitle(y, "Work Experience");
  (resumeData.work_experience || []).forEach(exp => {
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .text(`${exp.company} (${exp.duration})`, sidebarWidth + 20, y, { width: pageWidth - sidebarWidth - 40 });
    y += doc.heightOfString(`${exp.company} (${exp.duration})`, { width: pageWidth - sidebarWidth - 40 }) + 4;

    doc.font('Helvetica')
       .fontSize(10)
       .text(exp.role, sidebarWidth + 20, y, { width: pageWidth - sidebarWidth - 40 });
    y += doc.heightOfString(exp.role, { width: pageWidth - sidebarWidth - 40 }) + 4;

    exp.responsibilities.forEach(resp => {
      const bulletText = `• ${resp}`;
      doc.font('Helvetica')
         .fontSize(10)
         .text(bulletText, sidebarWidth + 40, y, { width: pageWidth - sidebarWidth - 60, lineGap: 2 });
      y += doc.heightOfString(bulletText, { width: pageWidth - sidebarWidth - 60, lineGap: 2 }) + 3;
    });
    y += 6;
  });

  y = sectionTitle(y, "Projects");
  (resumeData.projects || []).slice(0, 2).forEach(proj => {
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .text(`${proj.title} (${proj.year})`, sidebarWidth + 20, y, { width: pageWidth - sidebarWidth - 40 });
    y += doc.heightOfString(`${proj.title} (${proj.year})`, { width: pageWidth - sidebarWidth - 40 }) + 4;

    doc.font('Helvetica')
       .fontSize(10)
       .text(proj.role, sidebarWidth + 20, y, { width: pageWidth - sidebarWidth - 40 });
    y += doc.heightOfString(proj.role, { width: pageWidth - sidebarWidth - 40 }) + 4;

    const projectDesc = `• ${proj.description}`;
    doc.font('Helvetica')
       .fontSize(10)
       .text(projectDesc, sidebarWidth + 40, y, { width: pageWidth - sidebarWidth - 60, lineGap: 2 });
    y += doc.heightOfString(projectDesc, { width: pageWidth - sidebarWidth - 60, lineGap: 2 }) + 8;
  });

  // Finalize PDF
  doc.end();
}

module.exports = { generateResume };