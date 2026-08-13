// supabase/functions/compute-matches/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {

    const { item_id } = await req.json();

    if (!item_id) {
      return new Response(
        JSON.stringify({ error: "item_id required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }


    const { data: item, error } = await supabase
      .from("items")
      .select(
        "id,type,reporter_id,title,description,category,color,location,date_occurred"
      )
      .eq("id", item_id)
      .single();


    if (error || !item) {
      throw error ?? new Error("Item not found");
    }


    const oppositeType =
      item.type === "lost" ? "found" : "lost";


    const { data: candidates, error: candidatesError } = await supabase
  .from("items")
  .select(
    "id,reporter_id,title,description,category,color,location,date_occurred"
  )
  .eq("type", oppositeType);

if (candidatesError) {
  throw candidatesError;
}

console.log("Candidates:", candidates);



    const results = [];


    for (const candidate of candidates ?? []) {

      let score = 0;


      // Category match
      if (
        item.category &&
        candidate.category &&
        item.category.toLowerCase() ===
        candidate.category.toLowerCase()
      ) {
        score += 0.4;
      }


      // Color match
      if (
        item.color &&
        candidate.color &&
        item.color.toLowerCase() ===
        candidate.color.toLowerCase()
      ) {
        score += 0.3;
      }


      // Location match
      if (
        item.location &&
        candidate.location &&
        item.location.toLowerCase() ===
        candidate.location.toLowerCase()
      ) {
        score += 0.2;
      }


      // Title keyword match
      const itemWords =
        item.title.toLowerCase().split(" ");

      const candidateText =
        (
          candidate.title +
          " " +
          candidate.description
        ).toLowerCase();


      const keywordMatch =
        itemWords.filter((word:string)=>
          candidateText.includes(word)
        ).length;


      if(keywordMatch > 0){
        score += 0.1;
      }


      if(score < 0.4) continue;


      const lostItemId =
        item.type === "lost"
          ? item.id
          : candidate.id;


      const foundItemId =
        item.type === "lost"
          ? candidate.id
          : item.id;



      const {data:match,error:matchError} =
        await supabase
        .from("matches")
        .upsert(
          {
            lost_item_id: lostItemId,
            found_item_id: foundItemId,
            similarity_score: score,
            status:"suggested"
          },
          {
            onConflict:
            "lost_item_id,found_item_id"
          }
        )
        .select()
        .single();


      if(!matchError){
        results.push(match);
      }

    }


    return new Response(
      JSON.stringify({
        ok:true,
        matches:results
      }),
      {
        headers:{
          ...corsHeaders,
          "Content-Type":"application/json"
        }
      }
    );


  } catch(err){

    console.error(err);

    return new Response(
      JSON.stringify({
        error:String(err)
      }),
      {
        status:500,
        headers:{
          ...corsHeaders,
          "Content-Type":"application/json"
        }
      }
    );
  }

});