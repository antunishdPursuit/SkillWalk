"""Original synthetic fixture matching the tutorial's table-plus-chart exercise."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image, ImageDraw, ImageFont
def make_sample(destination):
    font_path="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    regular=ImageFont.truetype(font_path,28) if Path(font_path).exists() else ImageFont.load_default(size=28)
    small=ImageFont.truetype(font_path,24) if Path(font_path).exists() else ImageFont.load_default(size=24)
    table=Image.new("RGB",(1050,330),"white");d=ImageDraw.Draw(table)
    rows=[("Country","Population (millions)"),("United States","332"),("France","67"),("United Kingdom","67")]
    for i,row in enumerate(rows):
        top=i*80
        d.rectangle((3,top+2,1045,top+80),outline="black",width=3)
        d.line((570,top,570,top+80),fill="black",width=3)
        d.text((22,top+22),row[0],font=regular,fill="black")
        d.text((600,top+22),row[1],font=regular,fill="black")
    graph=Image.new("RGB",(1050,640),"white");d=ImageDraw.Draw(graph)
    d.text((240,10),"Illustrative population by country",font=regular,fill="black")
    d.text((2,58),"Millions",font=small,fill="black")
    left,bottom,top=100,550,100
    for val in range(0,151,25):
        y=bottom-(bottom-top)*val/150
        d.line((left,y,1010,y),fill="#bbbbbb",width=2)
        d.text((20,y-15),str(val),font=small,fill="black")
    d.line((left,top,left,bottom),fill="black",width=4)
    for x,country,val in [(220,"Japan",125),(510,"Germany",80),(800,"Egypt",104)]:
        y=bottom-(bottom-top)*val/150
        d.rectangle((x,y,x+140,bottom),fill="#416986",outline="black",width=2)
        d.text((x-3,bottom+18),country,font=regular,fill="black")
    pdf=canvas.Canvas(str(destination),pagesize=(612,792))
    pdf.setTitle("SkillWalk illustrative population worksheet")
    pdf.setFont("Helvetica-Bold",20);pdf.drawString(48,750,"Population worksheet")
    pdf.setFont("Helvetica",10)
    pdf.drawString(48,727,"Synthetic tutorial-style sample; illustrative figures, not current population data.")
    pdf.drawString(48,711,"Use the table and the chart together to answer questions.")
    pdf.drawImage(ImageReader(table),48,507,width=516,height=162)
    pdf.drawImage(ImageReader(graph),48,112,width=516,height=315)
    pdf.setFont("Helvetica",9);pdf.drawString(48,64,"Created for SkillWalk. The creator's original PDF was not supplied in the repository.")
    pdf.save()
if __name__=="__main__":
    import sys
    make_sample(Path(sys.argv[1]))
