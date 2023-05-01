#!/usr/bin/env python3
import csv
import openai
from datetime import datetime, timedelta
from Bio import Entrez
import re
from prettytable import PrettyTable
import json
import os
import markdown

Entrez.email = "your.email@example.com"
openai.api_key = "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"
days_to_query = 3
total_abstracts_to_eval = 5
n_abstracts = 2
directory = ""


def load_old():
    old = []
    with open("old.csv", mode="a+", newline='', encoding='utf-8') as file:
        file.seek(0)  # Move the file pointer to the beginning of the file
        csv_reader = csv.reader(file)
        for row in csv_reader:
            for num in row:
                old.append(num)
    return old

def sort_table_data(table, sortby, ascending=True):
    # Extract the data from the table and sort it based on the sortby column
    sorted_data = sorted(table._rows, key=lambda row: row[table._field_names.index(sortby)], reverse=not ascending)

    # Create a new PrettyTable object with the same field names
    sorted_table = PrettyTable()
    sorted_table.field_names = table.field_names

    # Add the sorted rows to the new table
    for row in sorted_data:
        sorted_table.add_row(row)

    return sorted_table

def create_newsletter(list, n_abstracts):
    info = ""
    counter=0
    response = "Here is our summary of the most relevant research for " + datetime.now().strftime("%A %d %B %Y")  + ".\n\n"
    for row in list:
        if counter == n_abstracts:
            break
        row.border = False
        row.header = False
        info = "#Title: " + row.get_string(fields=["Title"]) + "#\n"
        info += "Article type: " + row.get_string(fields=["gpt_article_type"]) + "\n"
        info += "Disease: " + row.get_string(fields=["gpt_disease"]) + "\n"
        info += row.get_string(fields=["Abstract"]) + "\n"

        response += row.get_string(fields=["gpt_disease"]).strip() + "\n"
        response += row.get_string(fields=["Title"]).strip() + "\n"
        response += "https://pubmed.ncbi.nlm.nih.gov/" + row.get_string(fields=["PMID"]).strip() + "\n\n"

        prompt= (f"Based on the following abstract:\n"
        f"{info}\n"
        f"Please write an informal research summary based on this information for an audience of experts. "
        f"For the study form briefly summarize the background, methology, and results. Comment on any important or unexpected findings. You may be conversational and relate to existing literature if relevant but be conservative and wary in your review. Remember you are writing as an expert for healthcare experts/colleagues so no need to give obvious insights. You do not need to comment who will benefit from the study as this is usually obvious (e.g. it is usually healthcare providers and patients). Write about 150 words, although longer if it is a very important study.")
        completion = openai.ChatCompletion.create(model = 'gpt-3.5-turbo', messages = [{'role': 'user', 'content': prompt}],temperature = 0)
        response += completion['choices'][0]['message']['content'] + "\n\n"
        counter +=1
    return response

def get_gpt_article_type(title, article_type, abstract, keywords):
    if article_type == "Journal Article":
        article_type = ""
    prompt = (f"Based on the following information:\n"
              f"Title: {title}\n"
              f"Article Type: {article_type}\n"
              f"Abstract: {abstract}\n"
              f"Keywords: {keywords}\n"
            "You are a professor of interventional neuroradiology. Categorize the text with respect to the following 4 categories. Return in the following format using no other words or other punctuation: Article type; Disease process; Population; Device; Device name; Rank. (Replace the preceeding terms with the answer). Return only in JSON format. ONLY choose out of the following terms or single integer number: \n\n"
        f"- article_type: Review Article, Systematic Review, Systematic Review and Meta-analysis, Randomized Controlled Trial, Randomized Controlled Trial (Retrospective Analysis), Prospective Cohort Study, Retrospective Cohort Study, Case-Control Study, Cross-Sectional Study, Population Analysis, Case Report, Case Series, Questionnaire/Survey, Technical Note, Equipment/Device Evaluation, Social Media Analysis, Methodology, Protocol, Editorial/Commentary/Opinion/Letter to the Editor, Book Review/Erratum/Retraction, Educational Article, Video-Audio Media, Cost Effectiveness Study, NA. \n\n"
        f"- disease: Cerebral Aneurysm, Arteriovenous Malformation, Dural Arteriovenous Fistula, Carotid Stenosis, Vertebral Stenosis, Intracranial Stenosis, Cerebral Vasospasm, Anterior Circulation Stroke, Posterior Circulation Stroke, Cerebral Venous Thrombosis, Intracranial Hemorrhage, Subarachnoid Hemorrhage, Spinal Dural Arteriovenous Fistula, Spinal Dural Arteriovenous Malformation, Pulsatile Tinnitus, Vein of Galen Malformation, Carotid-Cavernous Fistula,  Arterial Dissection, Subdural Hemorrhage, Cerebral Tumor, Intracranial Hypertension, Intracranial Hypotension, Trauma, Vein of Galen, Moyamoya, Pregnancy, Tumor, Carotid Web, Anatomical Variant, Epistaxis, CSF-Venous Fistula, NA. \n\n"
        f"- population: Pediatric, Elderly, NA. \n\n"
        f"- device: Mechanical Thrombectomy, Flow diverter, Coil, Intracranial stent, Stent retriever, Balloon guide catheter, Microcatheter, Guidewire, Cyanoacrylate glue, Copolymer liquid embolic, Particulate embolic agent, Microcatheter, Aspiration catheter, Guide catheter, Carotid artery stent, Embolic protection device, Distal access catheter, Vascular closure device, Angioplasty balloon, Intrasaccular device, Angiography machine, Anesthesia, Magnetic Resonance Imaging, Computed Tomography, Perfusion Imaging, Access technique, Transvenous, Transarterial, Radiosurgery, Robotic, Aspiration, Stent Retriever, Middle Meningeal Artery Embolization, Artificial Intelligence, Vessel Wall Imaging, Retinoblastoma, Antiplatelets, NA. \n\n"
        f"- name_device: Determine if there is a specific name for the main device used, otherwise return NA.\n"
        f"- rank: Rank the study in terms of methodological quality (i.e. Randomized Controlled Trials will score very well, but put Meta-analysis the same as an observational study, case reports will score low) and relevance to interventional neuroradiology. Rate higher if from the Journal of Neurointerventional Surgery [Return only an integer from 1 to 100]")

    completion = openai.ChatCompletion.create(model = 'gpt-3.5-turbo', messages = [{'role': 'user', 'content': prompt}],temperature = 0)
    response = completion['choices'][0]['message']['content']
    return json.loads(response)

# Use AI to categorize abstracts then save the results to a CSV file 
def save_csv(articles):
    with open("data.csv", mode="w", newline='', encoding='utf-8') as file:
        csv_writer = csv.writer(file)
        csv_writer.writerow(["Title", "Authors", "Publication Date", "Journal", "DOI", "PMID", "Article Type", "Abstract", "Keywords", "gpt_article_type", "gpt_disease", "gpt_population", "gpt_device", "gpt_device_name", "gpt_rank"])
        table = PrettyTable()
        table.field_names = ["Title", "Authors", "Publication Date", "Journal", "DOI", "PMID", "Article Type", "Abstract", "Keywords", "gpt_article_type", "gpt_disease", "gpt_population", "gpt_device", "gpt_device_name", "gpt_rank"]

        counter=0
        
        for article in articles["PubmedArticle"]:
            if counter ==total_abstracts_to_eval:
                break
            counter += 1
            print("- Abstracts evaluated: " + str(counter))
            title = article["MedlineCitation"]["Article"]["ArticleTitle"]
            authors = article["MedlineCitation"]["Article"].get("AuthorList", [])
            authors = ", ".join([f"{author['LastName']} {author.get('Initials', '')}" if 'LastName' in author else "" for author in authors])
            publication_date = article["MedlineCitation"]["Article"]["ArticleDate"][0]["Year"] if ("ArticleDate" in article["MedlineCitation"]["Article"] and article["MedlineCitation"]["Article"]["ArticleDate"]) else "N/A"
            journal = article["MedlineCitation"]["Article"]["Journal"]["Title"]
            doi = [id_info for id_info in article["PubmedData"]["ArticleIdList"] if id_info.attributes.get("IdType") == "doi"]
            doi = doi[0] if doi else ""
            pmid = article["MedlineCitation"]["PMID"]

            article_type = article["MedlineCitation"]["Article"]["PublicationTypeList"][0].title() if "PublicationTypeList" in article["MedlineCitation"]["Article"] else "N/A"
            abstract = " ".join([str(section) for section in article["MedlineCitation"]["Article"]["Abstract"]["AbstractText"]]) if "Abstract" in article["MedlineCitation"]["Article"] else "N/A"

            mesh_keywords = article["MedlineCitation"].get("MeshHeadingList", [])
            mesh_keywords = "; ".join([mesh["DescriptorName"] for mesh in mesh_keywords])

            # Additional keyword extraction
            keyword_list = article["MedlineCitation"].get("KeywordList", [])
            keywords = "; ".join([kw for kw_group in keyword_list for kw in kw_group])

            # Combine MeSH keywords and additional keywords
            all_keywords = "; ".join(filter(None, [mesh_keywords, keywords]))
            
            gpt_type = get_gpt_article_type(title, article_type, abstract, all_keywords)
                        
            table.add_row([title, authors, publication_date, journal, doi, pmid, article_type, abstract, all_keywords, gpt_type["article_type"], gpt_type["disease"], gpt_type["population"], gpt_type["device"], gpt_type["name_device"], gpt_type["rank"]])
            csv_writer.writerow([title, authors, publication_date, journal, doi, pmid, article_type, abstract, all_keywords, gpt_type["article_type"], gpt_type["disease"], gpt_type["population"], gpt_type["device"], gpt_type["name_device"], gpt_type["rank"]])
        
    return table

def main() -> None:
    # Create the newsletter directory if it doesn't exist
    #if not os.path.exists(directory):
    #    os.makedirs(directory)
    news_path = "news.html"

    query = '((((((((((((("Journal of neurointerventional surgery"[Journal]) OR ("Neurointervention"[Journal])) OR ("Interventional neurology"[Journal])) OR ("Interventional neuroradiology : journal of peritherapeutic neuroradiology, surgical procedures and related neurosciences"[Journal])) OR ("Journal of vascular and interventional neurology"[Journal])) OR ("Journal of cerebrovascular and endovascular neurosurgery"[Journal])) OR ("Clinical Neuroradiology"[Journal])) OR (Costalat, Vincent[Author])) OR (Chapot, Rene[Author])) OR (Krings, Timo[Author])) OR (cerebral aneurysm[Title])) OR (avm[Title])) OR (arteriovenous malformation[Title])) OR (venous stenting[Title]))OR (mechanical thrombectomy[Title])) OR (dural arteriovenous fistula[Title])) OR (Piotin, Michel[Author])))  '

    # Calculate the date range for the last 2 months
    today = datetime.today()
    two_months_ago = today - timedelta(days=days_to_query)
    date_range = f'{two_months_ago.strftime("%Y/%m/%d")}:{today.strftime("%Y/%m/%d")}[Publication Date]'
    search_results = Entrez.read(Entrez.esearch(db="pubmed", term=f"{query} AND {date_range}", retmax=1000))
    id_list = search_results["IdList"]

    # Load old published abstracts
    print("Loading list of old articles from old.csv")
    old = load_old()
    
    # Fetch the details of the articles
    print("Querying pubmed for abstracts")
    articles = Entrez.read(Entrez.efetch(db="pubmed", id=",".join(id_list), rettype="xml"))

    # Save results to CSV
    print("AI categorization and then saving sorted list to data.csv")
    table = save_csv(articles)
    table = sort_table_data(table, "gpt_rank", ascending=False)
    with open("data.csv", mode="w", newline='', encoding='utf-8') as file:
        file.write(table.get_csv_string())

    #print("BEFORE: "+str(old))


    print("Removing old abstracts from list we submit to generate the newsletter")
    # Removing old abstracts from list we submit to generate the newsletter
    pmid_field_index = table.field_names.index("PMID")
    filtered_rows = [row for row in table._rows if row[pmid_field_index] not in old]
    filtered_table = PrettyTable(table.field_names)
    for row in filtered_rows:
        filtered_table.add_row(row)
    table = filtered_table

    print("Saving new abstracts used in newsletter (so we don't repeat in the future)")
    # Write the abstract PMID to a file old.csv so we don't repeat them in future
    counter=0
    for row in table:
        if counter == n_abstracts:
            break
        row.border = False
        row.header = False
        pmid = row.get_string(fields=["PMID"]).strip()
        old.append(pmid)
        counter +=1
    with open("old.csv", mode="w", newline='', encoding='utf-8') as file:
        csv_writer = csv.writer(file)
        for row in old:
            csv_writer.writerow([row])

    print("Generating newsletter")
    newsletter = create_newsletter(table, n_abstracts)

    with open(news_path, mode="w", newline='', encoding='utf-8') as file:
        file.write(markdown.markdown(newsletter))

    print(newsletter)

    return

if __name__ == '__main__':
    main()
